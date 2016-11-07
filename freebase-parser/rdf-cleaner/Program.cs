using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace rdf_cleaner
{
  class WiretappedStream : Stream
  {
    private readonly Stream read_stream_;
    private long bytes_read_;
    private byte[] pattern_;
    public delegate void OnPattern(long index);
    private OnPattern on_pattern_;

    public override bool CanRead
    {
      get
      {
        return read_stream_.CanRead;
      }
    }

    public override bool CanSeek
    {
      get
      {
        return read_stream_.CanSeek;
      }
    }

    public override bool CanWrite
    {
      get
      {
        return read_stream_.CanWrite;
      }
    }

    public override long Length
    {
      get
      {
        return read_stream_.Length;
      }
    }

    public override long Position
    {
      get
      {
        return read_stream_.Position;
      }

      set
      {
        read_stream_.Position = value;
      }
    }

    public WiretappedStream(Stream read_stream, byte[] pattern, OnPattern on_pattern)
    {
      read_stream_ = read_stream;
      pattern_ = pattern;
      on_pattern_ = on_pattern;
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
      var br = read_stream_.Read(buffer, offset, count);
      if (read_stream_.Position >= bytes_read_)
      {
        for (int i = 0; i < br; ++i)
        {
          if (buffer[i] == pattern_[0])
          {
            bool match = true;
            for (int j = 1; j < pattern_.Length && (i + j) < br; ++j)
            {
              if (buffer[i + j] != pattern_[j])
              {
                match = false;
                break;
              }
            }
            if (match)
            {
              on_pattern_((read_stream_.Position - br) + offset + i);
            }
          }
        }
        bytes_read_ += br;
      }
      return br;
    }

    public override void Flush()
    {
      read_stream_.Flush();
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
      return read_stream_.Seek(offset, origin);
    }

    public override void SetLength(long value)
    {
      read_stream_.SetLength(value);
    }

    public override void Write(byte[] buffer, int offset, int count)
    {
      read_stream_.Write(buffer, offset, count);
    }
  }

  class GZipReader : Stream
  {
    private readonly Stream read_stream_;
    private GZipStream gzip_;
    private List<long> indexes_;
    private bool at_end_ = false;

    public override bool CanRead
    {
      get
      {
        return gzip_.CanRead;
      }
    }

    public override bool CanSeek
    {
      get
      {
        return gzip_.CanSeek;
      }
    }

    public override bool CanWrite
    {
      get
      {
        return gzip_.CanWrite;
      }
    }

    public override long Length
    {
      get
      {
        return gzip_.Length;
      }
    }

    public override long Position
    {
      get
      {
        return gzip_.Position;
      }

      set
      {
        gzip_.Position = value;
      }
    }

    public GZipReader(Stream read_stream)
    {
      read_stream_ = new WiretappedStream(read_stream, new byte[] { 0x1f, 0x8b, 0x8, 0, 0, 0, 0, 0, 0, 0 }, onPattern);
      gzip_ = new GZipStream(read_stream_, CompressionMode.Decompress, true);
      indexes_ = new List<long>();
    }

    private void onPattern(long index)
    {
      if (index != 0)
        indexes_.Add(index);
    }

    private int readNextChunk(byte[] buffer, int offset, int count)
    {
      var buf = new byte[4096];
      while (read_stream_.Position < read_stream_.Length || indexes_.Count != 0)
      {
        while (indexes_.Count != 0)
        {
          read_stream_.Position = indexes_[0];
          indexes_.RemoveAt(0);
          try
          {
            gzip_ = new GZipStream(read_stream_, CompressionMode.Decompress, true);
            return gzip_.Read(buffer, offset, count);
          }
          catch (Exception e)
          {
            // do nothing here, just try the next index
          }
        }
        read_stream_.Read(buf, 0, 4096);
      }
      Console.WriteLine("Reach EOF at {0:X}", read_stream_.Position);
      at_end_ = true;
      return 0;
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
      if (at_end_) return 0;
      var byte_read = gzip_.Read(buffer, offset, count);
      if (byte_read <= 0 && indexes_.Count != 0)
      {
        gzip_.Dispose();
        byte_read = readNextChunk(buffer, offset, count);
      }
      return byte_read;
    }

    public override void Flush()
    {
      gzip_.Flush();
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
      return gzip_.Seek(offset, origin);
    }

    public override void SetLength(long value)
    {
      gzip_.SetLength(value);
    }

    public override void Write(byte[] buffer, int offset, int count)
    {
      gzip_.Write(buffer, offset, count);
    }
  }

  class Program
  {
    static Dictionary<string, string> prefix_map = initialPrefixMap();
    static Dictionary<string, string> predicate_map = initialPredicateMap();
    static HashSet<string> throwable_predicates = initialThrowablePredicates();

    static Dictionary<string, string> initialPrefixMap()
    {
      Dictionary<string, string> map = new Dictionary<string, string>();
      map.Add("http://rdf.freebase.com/ns/", "ns");
      map.Add("http://rdf.freebase.com/key/", "key");
      map.Add("http://www.w3.org/2002/07/owl#", "owl");
      map.Add("http://www.w3.org/2000/01/rdf-schema#", "rdfs");
      map.Add("http://www.w3.org/1999/02/22-rdf-syntax-ns#", "rdf");
      map.Add("http://www.w3.org/2001/XMLSchema#", "xsd");
      return map;
    }

    static Dictionary<string, string> initialPredicateMap()
    {
      Dictionary<string, string> map = new Dictionary<string, string>();
      map.Add("<http://rdf.freebase.com/ns/type.permission.controls>", "<http://rdf.freebase.com/ns/m.0j2r9sk>");
      map.Add("<http://rdf.freebase.com/ns/dataworld.gardening_hint.replaced_by>", "<http://rdf.freebase.com/ns/m.0j2r8t8>");
      map.Add("<http://rdf.freebase.com/ns/type.object.type>", "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>");
      return map;
    }

    static HashSet<string> initialThrowablePredicates()
    {
      HashSet<string> set = new HashSet<string>();
      set.Add("<http://rdf.freebase.com/ns/type.type.instance>");
      set.Add("<http://rdf.freebase.com/ns/type.type.expected_by>");
      set.Add("<http://rdf.freebase.com/ns/common.notable_for.display_name>");
      return set;
    }

    static bool isURI(string str)
    {
      return str[0] == '<' && str[str.Length - 1] == '>';
    }

    static bool inEnglish(string obj)
    {
      var at_index = obj.LastIndexOf('@');
      if (at_index == -1) return true;
      return obj[obj.Length - 3] == '@' && obj[obj.Length - 2] == 'e' && obj[obj.Length - 1] == 'n';
    }

    static bool shouldKeepTriple(string subject, string predicate, string obj)
    {
      if (throwable_predicates.Contains(predicate)) return false;
      if (!inEnglish(obj)) return false;
      return !(predicate.Equals("<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>") && obj.StartsWith("<http://rdf.freebase.com"));
    }

    static bool tryChangePrefix(string content, char delimitter, StringBuilder sb)
    {
      var index = content.LastIndexOf(delimitter);
      if (index != -1)
      {
        var prefix = content.Substring(0, index + 1);
        string maps_to;
        if (prefix_map.TryGetValue(prefix, out maps_to))
        {
          sb.Append(maps_to);
          sb.Append(":");
          sb.Append(content.Substring(index + 1));
          return true;
        }
      }
      return false;
    }

    static string expandNode(string node)
    {
      if (!isURI(node)) return node;

      // remove '<', '>'
      var content = node.Substring(1, node.Length - 2);
      var sb = new StringBuilder(content.Length);

      if (tryChangePrefix(content, '#', sb) || tryChangePrefix(content, '/', sb))
      {
        return sb.ToString();
      }

      //Console.WriteLine("Unknown URI prefix in [{0}]", node);
      return node;
    }

    static string correctTriple(string triple_line)
    {
      var subject_index = triple_line.IndexOf('\t');
      var predicate_index = triple_line.IndexOf('\t', subject_index + 1);

      var subject = triple_line.Substring(0, subject_index);
      var predicate = triple_line.Substring(subject_index + 1, predicate_index - subject_index - 1);
      var obj = triple_line.Substring(predicate_index + 1, triple_line.Length - predicate_index - 3);

      if (!shouldKeepTriple(subject, predicate, obj)) return "";

      var sb = new StringBuilder(expandNode(subject), subject.Length + predicate.Length + obj.Length + 16);
      sb.Append("\t");
      string maps_to;
      sb.Append(expandNode(predicate_map.TryGetValue(predicate, out maps_to) ? maps_to : predicate));
      sb.Append("\t");
      sb.Append(expandNode(obj));
      sb.Append("\t.");

      return sb.ToString();
    }

    class InputWorker
    {
      private BlockingCollection<string> processed_triples_;
      private string file_;
      private ManualResetEventSlim starting_signal_;
      private ManualResetEvent done_signal_;

      public InputWorker(BlockingCollection<string> processed_triples, string file, ManualResetEventSlim starting_signal, ManualResetEvent done_signal)
      {
        processed_triples_ = processed_triples;
        file_ = file;
        starting_signal_ = starting_signal;
        done_signal_ = done_signal;
      }

      public void run(object obj)
      {
        starting_signal_.Wait();
        Console.WriteLine("Input Worker for [{0}] Started.", file_);
        using (FileStream rfs = new FileStream(file_, FileMode.Open, FileAccess.Read))
        {
          var gis = new GZipReader(rfs);
          var sr = new StreamReader(gis);
          long counter = 0;
          while (!sr.EndOfStream)
          {
            var triple = sr.ReadLine();
            var r = correctTriple(triple);
            if (r.Length > 0)
              processed_triples_.Add(r);

            counter++;
            if (counter % 50000000 == 0) Console.WriteLine("[ INPUT] Scanned {0} lines in file [{1}].", counter, file_);
          }
        }
        done_signal_.Set();
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
        Console.WriteLine("Output Worker on [{0}] Started.", file_);
        using (var wfs = new FileStream(file_, FileMode.Create, FileAccess.Write))
        using (var gs = new GZipStream(wfs, CompressionMode.Compress))
        using (var sw = new StreamWriter(gs))
        {
          string triple = "";
          long triple_counter = 0;
          while (processed_triples_.TryTake(out triple, -1))
          {
            sw.WriteLine(triple);
            triple_counter++;
            if (triple_counter % 50000000== 0) Console.WriteLine("[OUTPUT] Wrote {0} triples in file [{1}].", triple_counter, file_);
          }
        }
        done_signal_.Set();
      }
    }

    static void Main(string[] args)
    {
      const int INPUT_THREAD_NUMBER = 19;
      const int OUTPUT_THREAD_NUMBER = 8;

      var watch = System.Diagnostics.Stopwatch.StartNew();

      var starting_signal = new ManualResetEventSlim(false);
      var processed_triples = new BlockingCollection<string>(1000);

      var output_done_signals = new ManualResetEvent[OUTPUT_THREAD_NUMBER];
      var output_workers = new OutputWorker[OUTPUT_THREAD_NUMBER];
      for (int i = 0; i < OUTPUT_THREAD_NUMBER; i++)
      {
        var file = @"C:\\freebase\clean-freebase." + (i + 1) + ".gz";
        var s = new ManualResetEvent(false);
        var w = new OutputWorker(processed_triples, file, starting_signal, s);
        output_workers[i] = w;
        output_done_signals[i] = s;
        var output_worker = 
        ThreadPool.QueueUserWorkItem(w.run);
      }

      var input_workers = new InputWorker[INPUT_THREAD_NUMBER];
      var input_done_signals = new ManualResetEvent[INPUT_THREAD_NUMBER];
      for (int i = 0; i < INPUT_THREAD_NUMBER; i++)
      {
        var file = @"C:\\freebase\freebase-rdf-latest." + (i + 1) + ".gz";
        var s = new ManualResetEvent(false);
        var w = new InputWorker(processed_triples, file, starting_signal, s);
        input_workers[i] = w;
        input_done_signals[i] = s;
        ThreadPool.QueueUserWorkItem(w.run);
      }
      starting_signal.Set();
      WaitHandle.WaitAll(input_done_signals);
      processed_triples.CompleteAdding();
      WaitHandle.WaitAll(output_done_signals);

      watch.Stop();
      Console.WriteLine("Time used [{0}]", watch.ElapsedMilliseconds);
      Console.ReadLine();
    }
  }
}
