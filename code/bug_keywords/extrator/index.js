const natural = require("./node_modules/natural/index");
const sw = require("stopword");
const wtf = require("wtf_wikipedia");
const _ = require("lodash");
const fs = require("fs").promises;

const wikiPages = [
  {
    title: "Bug",
    lang: "fr",
    tokenizer: natural.AggressiveTokenizerFr,
    stemmer: natural.PorterStemmerFr,
    keywords: {},
    unstemmed: {},
  },
  {
    title: "BUG",
    lang: "ja",
    tokenizer: natural.TokenizerJa,
    stemmer: new natural.StemmerJa(),
    keywords: {},
    unstemmed: {},
  },
  {
    title: "Bug",
    lang: "en",
    tokenizer: natural.AggressiveTokenizer,
    stemmer: natural.PorterStemmer,
    keywords: {},
    unstemmed: {},
  },
  {
    title: "Bug",
    lang: "nl",
    tokenizer: natural.AggressiveTokenizerNl,
    stemmer: natural.PorterStemmerNl,
    keywords: {},
    unstemmed: {},
  },
  {
    title: "Bug",
    lang: "sv",
    tokenizer: natural.AggressiveTokenizerSv,
    stemmer: natural.PorterStemmerSv,
    keywords: {},
    unstemmed: {},
  },
  {
    title: "BUG",
    lang: "it",
    tokenizer: natural.AggressiveTokenizerIt,
    stemmer: natural.PorterStemmerIt,
    keywords: {},
    unstemmed: {},
  },
  {
    title: "Error_de_software",
    lang: "es",
    tokenizer: natural.AggressiveTokenizerEs,
    stemmer: natural.PorterStemmerEs,
    keywords: {},
    unstemmed: {},
  },
  {
    title: "Bug_(desambiguação)",
    lang: "pt",
    tokenizer: natural.AggressiveTokenizerPt,
    stemmer: natural.PorterStemmerPt,
    keywords: {},
    unstemmed: {},
  },
];

function getInternalPagesFromDisambiguation(doc) {
  const output = new Set();
  for (let list of doc.lists()) {
    for (let line of list.lines()) {
      for (let link of line.links()) {
        const linkPage = link.page();
        const linkText = link.text() ? link.text() : linkPage;
        if (line.text().indexOf(linkText) == 0) {
          output.add(linkPage);
        }
      }
    }
  }
  return Array.from(output);
}
function extractKeyWorkds(doc, page) {
  var results = [];
  var combined,
    combinedResults = {};
  const text = doc.text();
  const tokenizer = new page.tokenizer();

  _.each([1], function (ngram) {
    var keywordsForNgram;
    var tf = new natural.TfIdf();
    natural.TfIdf.prototype.listMostFrequestTerms = function (d) {
      var terms = [];
      for (var term in this.documents[d]) {
        terms.push({
          term: term,
          tf: natural.TfIdf.tf(term, this.documents[d]),
        });
      }
      return terms.sort(function (x, y) {
        return y.tf - x.tf;
      });
    };
    const tokenized = sw
      .removeStopwords(tokenizer.tokenize(text), sw[page.lang])
      .map((w) => {
        w = w.toLowerCase();
        const stem = page.stemmer.stem(w);
        if (
          !page.unstemmed.hasOwnProperty(stem) ||
          w.length < page.unstemmed[stem].length
        ) {
          page.unstemmed[stem] = w;
        }
        return stem;
      })
      .filter((w) => w.length > 1 && isNaN(w));
    const words = sw.removeStopwords(tokenized, sw[page.lang]);
    var ngrams = _.map(natural.NGrams.ngrams(words, ngram), function (ngram) {
      return ngram.join(" ").toLowerCase();
    });
    tf.addDocument(ngrams);
    keywordsForNgram = tf.listMostFrequestTerms(0);
    results = results.concat(keywordsForNgram);
  });
  _.each(results, function (result) {
    combinedResults[result.term] = result.tf;
  });
  combine = function (phrases, cutoff) {
    var combined = _.clone(phrases);

    _.each(_.keys(phrases), function (phrase) {
      var ngramToTry;
      ngramToTry = phrase.split(" ").length - 1;

      if (ngramToTry < 1) return;

      _.each(natural.NGrams.ngrams(phrase, ngramToTry), function (ngram) {
        var subPhrase = ngram.join(" ");
        if (phrases[subPhrase]) {
          if (!cutoff || phrases[phrase] / phrases[subPhrase] >= 1 - cutoff) {
            delete combined[subPhrase];
          }
        }
      });
    });
    return combined;
  };
  combined = combine(combinedResults, 0.5);
  combined = _.chain(combined)
    .toPairs()
    .sortBy(_.last)
    .reverse()
    .map(function (combination) {
      return { term: combination[0], tf: combination[1] };
    })
    .value();
  combined.forEach(function (result) {
    result.term = _.map(result.term.split(" "), (w) => {
      return page.unstemmed[w];
    }).join(" ");
  });
  for (let k of combined) {
    page.keywords[k.term] = (page.keywords[k.term] || 0) + k.tf;
  }
  return combined;
}
async function getPage(title, lang) {
  return await wtf.fetch(title, { lang });
}

(async () => {
  let reandme = "# Keywords from Bug on Wikipedia\n";
  for (let page of wikiPages) {
    if (require("fs").existsSync(`./keywords/${page.lang}.json`)) {
      const data = JSON.parse(
        await fs.readFile(`./keywords/${page.lang}.json`)
      );
      let keywords = Object.keys(data);
      keywords = keywords.sort(function (x, y) {
        return data[y] - data[x];
      });
      reandme += `\n## Keywords for Bug in ${page.lang}\n`
      reandme += "```\n"
      for (let keyword of keywords.slice(0, 20)) {
        reandme += keyword + "\n"
      }
      reandme += "```\n"
      continue;
    }
    const doc = await getPage(page.title, page.lang);
    if (doc.isDisambiguation()) {
      const internalPages = getInternalPagesFromDisambiguation(doc);
      for (let internalPage of internalPages) {
        const linkedDoc = await getPage(internalPage, page.lang);
        if (linkedDoc == null) {
          continue;
        }
        extractKeyWorkds(linkedDoc, page);
        console.log(internalPage, page.lang, Object.keys(page.keywords).length);
      }
    } else {
      extractKeyWorkds(doc, page);
    }
    const keywords = Object.keys(page.keywords);
    keywords.sort(function (x, y) {
      return y.tf - x.tf;
    });
    await fs.writeFile(
      `./keywords/${page.lang}.json`,
      JSON.stringify(page.keywords)
    );
    console.log(keywords.slice(0, 100));
  }
  console.log(reandme)
  fs.writeFile("keywords.md", reandme)
})();
