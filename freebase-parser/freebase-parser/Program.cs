using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using VDS.RDF.Parsing;
using VDS.RDF.Parsing.Handlers;
using System.IO.Compression;
using System.Collections.Concurrent;

namespace freebase_parser
{
  class Program
  {
    static HashSet<string> subjects_wanted;
    static HashSet<string> objects_wanted;
    static HashSet<string> keys_ignore;
    static HashSet<string> no_tracking_predicates;

    class TripleFilteringWorker
    {
      private BlockingCollection<string> processed_triples_;
      private string file_;
      private ManualResetEventSlim starting_signal_;
      private ManualResetEvent done_signal_;
      private HashSet<string> subjects_to_search;

      public TripleFilteringWorker(BlockingCollection<string> processed_triples, string file, ManualResetEventSlim starting_signal, 
                                   ManualResetEvent done_signal)
      {
        processed_triples_ = processed_triples;
        file_ = file;
        starting_signal_ = starting_signal;
        done_signal_ = done_signal;
        subjects_to_search = new HashSet<string>();
      }

      public void run(object obj)
      {
        starting_signal_.Wait();
        Console.WriteLine("Triple Processing Worker for [{0}] Started.", file_);
        using (FileStream rfs = new FileStream(file_, FileMode.Open, FileAccess.Read))
        {
          var gis = new GZipStream(rfs, CompressionMode.Decompress);
          var sr = new StreamReader(gis);
          long counter = 0;
          while (!sr.EndOfStream)
          {
            var triple = sr.ReadLine();
            var r = filterTriple(triple);
            if (r.Length > 0)
              processed_triples_.Add(r);

            counter++;
            //if (counter % 100000000 == 0) Console.WriteLine("[INPUT ] Scanned {0} lines in file [{1}]", counter, file_);
          }
        }
        done_signal_.Set();
      }

      public IEnumerable<string> getKeysFound()
      {
        return subjects_to_search;
      }
     
      private bool shouldKeepTriple(string subject, string predicate, string obj)
      {
        return (subjects_wanted.Contains(subject) || objects_wanted.Contains(obj))
            && !(keys_ignore.Contains(subject) || keys_ignore.Contains(obj) || keys_ignore.Contains(predicate))
            && !predicate.StartsWith("key:wikipedia");
      }

      private static bool shouldTrack(string str)
      {
        if (str[0] == '<' && str[str.Length - 1] == '>') return false;
        var colon_index = str.IndexOf(':');
        return !(colon_index == -1) && (str.IndexOf(':', colon_index + 1) == -1);
      }

      private string filterTriple(string triple_line)
      {
        var subject_index = triple_line.IndexOf('\t');
        var predicate_index = triple_line.IndexOf('\t', subject_index + 1);

        var subject = triple_line.Substring(0, subject_index);
        var predicate = triple_line.Substring(subject_index + 1, predicate_index - subject_index - 1);
        var obj = triple_line.Substring(predicate_index + 1, triple_line.Length - predicate_index - 3);

        if (!shouldKeepTriple(subject, predicate, obj)) return "";

        if (shouldTrack(subject)) subjects_to_search.Add(subject);
        if (!no_tracking_predicates.Contains(predicate) && shouldTrack(obj))
        {
          subjects_to_search.Add(obj);
          if (obj == "ns:common.topic")
            Console.WriteLine("{0}\t{1}\t{2}", subject, predicate, obj);
        }
        return triple_line;
      }
    }

    class OutputWorker
    {
      private BlockingCollection<string> processed_triples_;
      private string file_;
      private ManualResetEventSlim starting_signal_;
      private ManualResetEvent done_signal_;

      public OutputWorker(BlockingCollection<string> processed_triples, string file, ManualResetEventSlim starting_signal, ManualResetEvent done_signal)
      {
        processed_triples_ = processed_triples;
        file_ = file;
        starting_signal_ = starting_signal;
        done_signal_ = done_signal;
      }

      public void run(object _)
      {
        starting_signal_.Wait();
        Console.WriteLine("Output Writing Worker Started.");
        using (var wfs = new FileStream(file_, FileMode.Create, FileAccess.Write))
        using (var sw = new StreamWriter(wfs))
        {
          string triple = "";
          long triple_counter = 0;
          while (processed_triples_.TryTake(out triple, -1))
          {
            sw.WriteLine(triple);
            triple_counter++;
            //if (triple_counter % 100000 == 0) Console.WriteLine("[OUTPUT] Wrote {0} triples in file [{1}].", triple_counter, file_);
          }
        }
        done_signal_.Set();
      }
    }

    static void Main(string[] args)
    {
      const int FILTER_THREAD_NUMBER = 8;
      const int RELATION_DEGREES = 3;

      keys_ignore = new HashSet<string>();
      keys_ignore.Add("ns:type.type");
      keys_ignore.Add("rdfs:Class");
      keys_ignore.Add("ns:type.object.key");
      keys_ignore.Add("ns:common.topic.topic_equivalent_webpage");

      no_tracking_predicates = new HashSet<string>();
      no_tracking_predicates.Add("rdf:type");
      no_tracking_predicates.Add("ns:type.property.expected_type");
      no_tracking_predicates.Add("rdfs:range");
      no_tracking_predicates.Add("ns:topic_server.webref_cluster_members_type");

      objects_wanted = new HashSet<string>();
      objects_wanted.Add("ns:computer.programming_language");

      subjects_wanted = new HashSet<string>();
      var subjects_so_far = subjects_wanted;

      var watch = System.Diagnostics.Stopwatch.StartNew();

      for (int i = 0; i < RELATION_DEGREES; ++i)
      {
        Console.WriteLine("Start searching {0}-degree-away items, with {1} subjects wanted.", i + 1, subjects_wanted.Count);

        var sub_watch = System.Diagnostics.Stopwatch.StartNew();

        var starting_signal = new ManualResetEventSlim(false);
        var processed_triples = new BlockingCollection<string>(1000);

        var output_done_signal = new ManualResetEvent(false);
        var output_file = @"C:\\freebase\pl-output." + (i + 1) + ".txt";
        var output_worker = new OutputWorker(processed_triples, output_file, starting_signal, output_done_signal);
        ThreadPool.QueueUserWorkItem(output_worker.run);

        var filter_workers = new TripleFilteringWorker[FILTER_THREAD_NUMBER];
        var filter_done_signals = new ManualResetEvent[FILTER_THREAD_NUMBER];
        for (int j = 0; j < FILTER_THREAD_NUMBER; j++)
        {
          var file = @"C:\\freebase\clean-freebase." + (j + 1) + ".gz";
          var s = new ManualResetEvent(false);
          var w = new TripleFilteringWorker(processed_triples, file, starting_signal, s);
          filter_workers[j] = w;
          filter_done_signals[j] = s;
          ThreadPool.QueueUserWorkItem(w.run);
        }
        starting_signal.Set();
        WaitHandle.WaitAll(filter_done_signals);
        processed_triples.CompleteAdding();
        output_done_signal.WaitOne();

        var next_subjects_wanted = new HashSet<string>();
        for (int j = 0; j < FILTER_THREAD_NUMBER; j++)
        {
          next_subjects_wanted.UnionWith(filter_workers[j].getKeysFound());
        }
        next_subjects_wanted.ExceptWith(subjects_so_far);
        subjects_so_far.UnionWith(next_subjects_wanted);
        subjects_wanted = next_subjects_wanted;
        objects_wanted.Clear();

        sub_watch.Stop();
        Console.WriteLine("Time used in degree {0} search: [{1}]", i + 1, sub_watch.ElapsedMilliseconds);
      }
      watch.Stop();
      Console.WriteLine("Total Time Used [{0}]", watch.ElapsedMilliseconds);
      Console.ReadLine();
    }
  }
}
