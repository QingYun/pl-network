const path = require('path');
const fs = require('fs');
const Transform = require('stream').Transform;
const _ = require('lodash');
const levelGraph = require('levelgraph');
const level = require('level-browserify');
const csvStringifier = require('csv-stringify');

const DATA_FILE = path.join('c:', 'freebase', 'raw-pl-data', 'pl-output.txt');
const TARGET_DIR = path.join('.', 'data');
const DB_DIR = path.join('c:', 'freebase', 'programming-languages');
const PL_NETWORK_RELATIONSHIPS = [
  'ns:computer.programming_language.influenced',
  'ns:computer.programming_language.influenced_by',
  'ns:computer.programming_language.dialects',
  'ns:computer.programming_language.parent_language',
];
const PL_NETWORK_PROPS = [
  'ns:type.object.name',
  'ns:computer.programming_language.introduced',
];
const PL_NETWORK_LABEL_ONLY_PROPS = [
  'ns:kg.object_profile.prominent_type',
  'ns:computer.programming_language.language_paradigms',
];
const PL_NO_TRACKING_PROPS = [
  'rdf:type',
  'ns:common.topic.notable_types',
  'ns:common.topic.notable_for',
  'ns:freebase.valuenotation.is_reviewed',
  'ns:user.uoa_it.uoa_it.uoa_technology.provided_by',
  'ns:user.tsegaran.business.trademark.holder',
  'ns:base.motorcycle.internet_forum.discussion_topic_s',
  'ns:base.database.database.financial_supporter_s',
  'ns:freebase.user_profile.i_like_it',
  'ns:organization.organization.board_members',
  'ns:user.alexander.philosophy.philosopher.interests',
  'ns:education.academic.research_areas',
  'ns:user.uoa_it.uoa_it.uoa_application.provided_by',
  'ns:organization.organization.partnerships',
  'ns:base.database.database.home_page1',
  'ns:base.database.database_website.linked_database_s',
  'ns:internet.website_category.sites',
  'ns:internet.website_owner.websites_owned',
  'ns:internet.api.site',
  'ns:user.jamslevy.plopquiz.proficiency.proficiency_domain',
  'ns:symbols.namesake.named_after',
  'ns:user.alexander.philosophy.subject.philosophers',
  'ns:common.image.appears_in_topic_gallery',
  'ns:influence.influence_node.influenced_by',
  'ns:influence.influence_node.influenced',
  'ns:base.skosbase.skos_concept.in_scheme',
  'ns:internet.website.category',
  'ns:base.metaschema.category.generalization',
  'ns:internet.blog.focus',
  'ns:organization.organization.organization_type',
  'ns:business.business_operation.industry',
  'ns:base.services.web_hosting_service.web_host_server_side_services',
  'ns:computer.software_compatibility.software',
  'ns:user.uoa_it.uoa_it.uoa_vendor.provides_technology',
  'ns:computer.software_developer.software',
  'ns:computer.software_genre.software_in_genre',
  'ns:user.uoa_it.uoa_it.uoa_vendor.provides_application',
  'ns:user.uoa_it.uoa_it.uoa_technology.used_for',
  'ns:computer.software_genre.software_in_genre',
  'ns:base.web_design.web_design_company.website',
  'ns:base.services.web_development_platform.web_designers_supporting',
  'ns:education.educational_institution.subsidiary_or_constituent_schools',
  'ns:education.educational_institution.parent_institution',
  'ns:base.skosbase.skos_concept_scheme.concepts',
  'ns:base.skosbase.skos_concept.broader',
  'ns:base.centreforeresearch.software_technology.used_in_project',
  'ns:common.image.appears_in_topic_gallery',
  'ns:business.business_operation.industry',
  'ns:organization.organization.organization_type',
];
const PL_LABEL_ONLY_PROPS = [
  'ns:people.person.gender',
  'ns:people.person.nationality',
  'ns:computer.programming_language.developers',
  'ns:computer.programming_language.language_designers',
  'ns:symbols.namesake.named_after',
  'ns:computer.programming_language.language_paradigms',
  'ns:law.invention.inventor',
  'ns:book.written_work.subjects',
  'ns:common.topic.subject_of',
  'ns:conferences.conference_series.sponsoring_organization',
  'ns:book.book.genre',
  'ns:computer.software.software_genre',
  'ns:computer.software_genre.parent_genre',
  'ns:common.topic.subjects',
  'ns:cvg.computer_videogame.influenced',
  'ns:cvg.computer_game_engine.used_for_computer_games',
  'ns:computer.internet_protocol.software_used_by',
  'ns:education.school_category.schools_of_this_kind',
  'ns:base.umltools.documentation_type.tool',
  'ns:computer.software.license',
  'ns:event.speech_or_presentation.speech_topic',
  'ns:common.webpage.topic',
  'ns:base.umltools.uml_tool.reverse_engineering',
  'ns:base.umltools.uml_tool.language_specific_datatypes',
  'ns:computer.software.languages_used',
  'ns:book.written_work.author',
  'ns:media_common.quotation.source',
  'ns:computer.file_format.genre',
];
const PL_LABEL_PREDICATES = [
  'ns:type.object.name',
  'rdfs:label',
];

class TripleWriter extends Transform {
  constructor(options) {
    super(options);
    this.buff = '';
    this.counter = 0;
  }

  _transform(chunk, encoding, callback) {
    this.buff += chunk;
    const lines = this.buff.split('\r\n');
    if (this.counter++ % 50 === 0) console.log(this.counter, lines.length);
    this.buff = '';
    lines.forEach((line) => {
      if (line.endsWith('.')) {
        const parts = line.split('\t');
        this.push({
          subject: parts[0],
          predicate: parts[1],
          object: parts[2],
        });
      } else {
        this.buff += line;
      }
    });
    callback();
  }
}

function getProperty(db, subject, predicate) {
  return new Promise((resolve, reject) => {
    db.search([{
      subject,
      predicate,
      object: db.v('prop'),
    }], (err, list) => {
      if (err) return reject(err);
      return resolve(list.map(o => o.prop));
    });
  });
}

function getLabel(db, subject) {
  return new Promise((resolve, reject) => {
    Promise.all(PL_LABEL_PREDICATES.map(p => getProperty(db, subject, p)))
      .then(props => resolve(_.uniq(_.flatten(props))))
      .catch(reject);
  });
}

const subjectStat = {};
function getPropertyTree(db, depth, subject, excludedPredicates, excludedObjects, labelOnlyPredicates) {
  if (depth === 0 || subject === undefined) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    db.search([{
      subject,
      predicate: db.v('p'),
      object: db.v('o'),
    }], (err, list) => {
      if (err) return reject(err);
      if (list.length === 0) return resolve(subject);
      const [subjectsToTrack, subjectsToKeep] = _.partition(list, r =>
        excludedPredicates.indexOf(r.p) === -1 && excludedObjects.indexOf(r.o) === -1);
      const propPromises = subjectsToTrack
        .map(r => {
          if (labelOnlyPredicates.indexOf(r.p) !== -1) {
            return getLabel(db, r.o).then(labels => ({ [r.p]: labels }));
          }
          subjectStat[subject] = (subjectStat[subject] || 0) + 1;
          if (subjectStat[subject] > 10 && subjectStat[subject] % 10 === 0) console.log(`${subject} => ${r.o}`)
          return getPropertyTree(db, depth - 1, r.o,
                                 excludedPredicates,
                                 excludedObjects.concat(subjectsToTrack.map(r => r.o)),
                                 labelOnlyPredicates)
            .then(props => ({ [r.p]: [props] }))
        });
      return Promise.all(propPromises)
        .then(props => resolve(
          props.concat(subjectsToKeep.map(r => ({ [r.p]: [r.o] }))).reduce(_.merge, {})
        ));
    });
  });
}

function getLanguages(db) {
  console.log('querying languages')
  return new Promise((resolve, reject) => {
    db.search([{
      subject: db.v('lang_id'),
      predicate: 'ns:kg.object_profile.prominent_type',
      object: 'ns:computer.programming_language',
    }], (err, list) => {
      if (err) return reject(err);
      const promises = list
        .map(o => o.lang_id)
        .map((langId) => {
          const networkProps = PL_NETWORK_PROPS.concat(PL_NETWORK_RELATIONSHIPS)
            .map(prop =>
              getProperty(db, langId, prop).then(propValues => ({ [prop]: propValues })));

          const networkLabelOnlyProps = PL_NETWORK_LABEL_ONLY_PROPS
            .map(prop => getProperty(db, langId, prop)
              .then(propNodes => Promise.all(propNodes.map(p => getLabel(db, p))))
              .then(labels => ({ [prop]: _.flatten(labels) }))
            );

          return Promise.all(networkProps.concat(networkLabelOnlyProps))
            .then(props => ({
              [langId]: props.reduce(_.merge, {}),
            }));
        });
      return Promise.all(promises).then(resolve);
    });
  });
}

function getLanguageProps(db, allLanguages, langId) {
  console.log(`getting language props for ${langId}`)
  return new Promise((resolve, reject) => {
    const propsToExclude = _.flattenDeep([
      PL_NETWORK_PROPS, PL_NO_TRACKING_PROPS, PL_NETWORK_RELATIONSHIPS, PL_NETWORK_LABEL_ONLY_PROPS,
    ]);
    getPropertyTree(db, 3, langId, propsToExclude, allLanguages, PL_LABEL_ONLY_PROPS)
      .then(props => resolve({ [langId]: props }))
      .catch(reject);
  });
}

function importRdf(file, db) {
  return new Promise((resolve) => {
    const putStream = db.putStream();
    putStream.on('close', resolve);
    fs.createReadStream(file).pipe(new TripleWriter({ objectMode: true })).pipe(putStream);
  });
}

function writeFile(file, content) {
  return new Promise((resolve, reject) =>
    fs.writeFile(file, content, (err) => {
      if (err) reject(err);
      resolve();
    })
  );
}

function writeNetworkNodeCsv(file, contentObj) {
  return new Promise((resolve, reject) => {
    const attributes = PL_NETWORK_PROPS;
    const attrWithLabel = _.clone(PL_NETWORK_PROPS);
    attrWithLabel.splice('ns:type.object.name', 1, 'Label');
    const options = { header: true, columns: ['Id'].concat(attrWithLabel) };
    const lines = _.chain(contentObj).toPairs()
      .map(([langId, body]) =>
        [langId].concat(attributes.map(attr => body[attr].join(',')))
      )
      .value();
    csvStringifier(lines, options, (err, csv) => {
      if (err) return reject(err);
      return writeFile(file, csv).then(resolve);
    });
  });
}

function writeNetworkEdgeCsv(file, contentObj) {
  return new Promise((resolve, reject) => {
    const options = { header: true, columns: ['Source', 'Target', 'Label'] };
    const lines = _.chain(contentObj).toPairs()
      .flatMap(([landId, body]) =>
        _.flatMap(PL_NETWORK_RELATIONSHIPS, p =>
          body[p].map(v => ([landId, v, p]))
        )
      )
      .value();
    csvStringifier(lines, options, (err, csv) => {
      if (err) return reject(err);
      return writeFile(file, csv).then(resolve);
    });
  });
}

function cleanFields(v) {
  if (_.isString(v)) {
    if (v[0] === '"' && v[v.length - 1] === '"') {
      return v.slice(1, -1);
    }
    if (v.endsWith('@en')) {
      return v.slice(1, -4);
    }
    if (v.endsWith('^^<http://www.w3.org/2001/XMLSchema#gYear>')) {
      return v.slice(1, -43);
    }
    if (v.endsWith('^^<http://www.w3.org/2001/XMLSchema#gYearMonth>')) {
      return v.slice(1, -48);
    }
    if (v.endsWith('^^<http://www.w3.org/2001/XMLSchema#date>')) {
      return v.slice(1, -42);
    }
    return v;
  }

  if (_.isArray(v)) {
    return v.map(cleanFields);
  }

  if (_.isObject(v)) {
    return _.keys(v).map(k => ({ [k]: cleanFields(v[k]) })).reduce(_.assign, {});
  }
}

const db = levelGraph(level(DB_DIR));

getLanguages(db)
.then((languages) => {
  const languagesObj = cleanFields(languages.reduce(_.merge, {}));
  const networkJsonFile = writeFile(path.join(TARGET_DIR, 'pl-network.json'), JSON.stringify(languagesObj));
  const networkNodeCsvFile = writeNetworkNodeCsv(path.join(TARGET_DIR, 'pl-network-node.csv'), languagesObj);
  const networkEdgeCsvFile = writeNetworkEdgeCsv(path.join(TARGET_DIR, 'pl-network-edge.csv'), languagesObj);
  const langIDs = languages.map(l => _.keys(l)[0]);
  const languageFiles = langIDs
    .map(l =>
      getLanguageProps(db, langIDs, l)
        .then(props =>
          writeFile(path.join(TARGET_DIR, `${l.replace(':', '_')}.json`), JSON.stringify(cleanFields(props)))
        )
    );
  return Promise.all(languageFiles.concat([networkJsonFile, networkNodeCsvFile, networkEdgeCsvFile]));
})
.then(() => console.log('finished'));
