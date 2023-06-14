#!/usr/bin/env node
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import validUrl from 'valid-url';
import { URL } from 'url';
import https from 'https';
import open from 'open';
import genHTMLReport from './report.js';
import analyzeLs from './analyzer.js';

const argv = yargs(hideBin(process.argv))
  .usage("Usage: [-u] <url>")
  .option("u", {
    alias: "url",
    describe: "URL to crawl",
    type: "string"
  })
  .argv;

const url = argv.url || argv._[0];

const handleFeedData = (data, resolve) => {
  let respBody = Buffer.concat(data);
  const $ = cheerio.load(respBody.toString(), { xmlMode: true });
  let urlRegex = /(http[s]?:\/\/){1}(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/g;
  let allTxt = $.root().text();
  let lnks = allTxt.match(urlRegex);
  resolve(lnks);
};

const handleFeedResponse = (resp, resolve) => {
  let data = [];
  resp.on('data', (frg) => {
    data.push(frg);
  });
  resp.on('end', () => {
    handleFeedData(data, resolve);
  });
};

const fetchFeed = url => new Promise((resolve, reject) => {
  https.get(url, resp => {
    handleFeedResponse(resp, resolve);
  }).on('error', err => {
    console.error(`Error on ${url}: ${err.message}`);
    resolve([]);
  });
});

const getSEOHeadData = body => {
    const $ = cheerio.load(body);
    const titleStatic = $('head title').text();
    console.log(`Title: ${titleStatic}`);
    const canonicalStatic = $('head link[rel="canonical"]').attr('href');
    console.log(`Canonical: ${canonicalStatic}`);
    return { titleStatic, canonicalStatic };
}


const collectOnpageLinks = async (url, isStatic = false) => {
  let respBody, respHeaders;
  if (isStatic) {
    const resp = await fetchStaticPage(url);
    respBody = resp.body;
    respHeaders = resp.headers;
  } else {
    const resp = await fetchRenderedPage(url);
    respBody = resp.body;
  }
  const $ = cheerio.load(respBody.toString());
  const links = Array.from($("*[href], *[src]")).map(a => $(a).attr("href") || $(a).attr("src"));
  return links.filter(Boolean);
};

const commonHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537',
  'Accept-Language': 'en-US,en;q=0.9'
};

const fetchStaticPage = async url => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: commonHeaders }, resp => {
      let data = [];
      resp.on('data', (frg) => {
        data.push(frg);
      });
      resp.on('end', () => {
        const respBody = Buffer.concat(data);
        resolve({ body: respBody, headers: resp.headers, statusCode: resp.statusCode });
      });
    }).on('error', err => {
      reject(err);
    });
  });
};

let browser;

const getBrowser = async () => {
    if (!browser) {
        browser = await puppeteer.launch({ headless: false });
          console.log(`Browser instance created`);
    }
    return browser;
};


const fetchRenderedPage = async url => {
  console.log(`Fetching rendered page for ${url}`);
  const browser = await getBrowser();

  const page = await browser.newPage();
  console.log(`New page created`);
  await page.setExtraHTTPHeaders(commonHeaders);
  console.log(`Extra HTTP headers set`);
  const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  console.log(`Page navigation complete`);
  const respBody = await page.content();
  console.log(`Page content fetched`);
  const respHeaders = response.headers();
  console.log(`Response headers fetched`);
  const statusCode = response.status();
  console.log(`Response status code: ${statusCode}`);
  //await browser.close();
  console.log(`Browser instance closed`);
  return { body: respBody, headers: respHeaders, statusCode: statusCode };
};


const checkLnk = async (lnk, ls) => {
  try {
      const resp = await fetchStaticPage(lnk);
      const statusCode = resp.statusCode;
      const redirUrl = statusCode >= 300 && statusCode < 400 ? resp.headers.location : null;
      const canonicalHeader = resp.headers.link && resp.headers.link.includes('rel="canonical"') 
                              ? resp.headers.link.split('; ')[0] 
                              : null;
      console.log(`Checked ${lnk} - Status: ${statusCode}`);

            if (statusCode === 200) {
          const contentType = resp.headers['content-type'];
          console.log(`Content-Type: ${contentType}`);
          const { titleStatic, canonicalStatic } = getSEOHeadData(resp.body.toString());
          let titleRendered = "";
          let canonicalRendered = "";
          if (contentType.toLowerCase().includes('text/html')) {
            const { body: respBodyRendered, headers: respHeadersRendered } = await fetchRenderedPage(lnk);
            const $ = cheerio.load(respBodyRendered.toString());
            titleRendered = $('title').text();
            canonicalRendered = $('link[rel="canonical"]').attr('href');
          }
          ls[lnk] = {
            sc: statusCode,
            redirUrl,
            canonicalHeader,
            titleStatic,
            canonicalStatic,
            contentType,
            titleRendered,
            canonicalRendered
          };
      } else {
          ls[lnk] = {
              sc: statusCode,
              redirUrl,
              canonicalHeader
          };
      }
  } catch (err) {
      console.error(`Error on ${lnk}: ${err.message}`);
  }
};


const checkLnks = async (dmn, lnks, ls) => {
  const promises = [];
  for(let lnk of lnks) {
    if (lnk.includes(dmn) && validUrl.isWebUri(lnk)) {
      promises.push(checkLnk(lnk, ls));
    }
  }
  await Promise.all(promises);
}




const run = async url => {
  const ls = {};
  const parsedUrl = new URL(url);
  const dmn = parsedUrl.hostname;
  console.log(`Crawling ${url}`);
  let allLnks = [];
  if (/\.(xml|rss)$/.test(url) || /\/feed\/?$/.test(url)) {
    const feedLnks = await fetchFeed(url);
    allLnks = allLnks.concat(feedLnks);
  } else {
    const staticLnks = await collectOnpageLinks(url, true);
    const renderedLnks = await collectOnpageLinks(url);
    allLnks = allLnks.concat(staticLnks, renderedLnks, url);
  }
  allLnks = [...new Set(allLnks)];
  allLnks = allLnks.map(lnk => {
    if (typeof lnk === 'string' && !lnk.startsWith('http')) {
      return new URL(lnk, url).href;
    }
    return lnk;
  });
  allLnks = allLnks.filter(lnk => typeof lnk === 'string' && new URL(lnk).hostname === dmn && validUrl.isWebUri(lnk));
  allLnks.sort((a, b) => b.length - a.length);
  console.log(`Checking links for domain ${dmn}`);
  await checkLnks(dmn, allLnks, ls);

  const analyzedLs = analyzeLs(ls);
  const sortedLs = sortLs(analyzedLs);
  open(genHTMLReport(url, sortedLs));
  //const browser = await getBrowser();
  //await browser.close();
  process.exit();
};




const sortLs = ls => {
  let entries = Object.entries(ls);

  // Sort by status code (highest first), then by URL length (shortest first).
  entries.sort((a, b) => b[1].sc - a[1].sc || a[0].length - b[0].length);

  // For HTTP 200, sort by HTML content type length.
  entries = entries.map(entry => {
    if(entry[1].sc === 200 && entry[1].contentType && entry[1].contentType.includes('html')) {
      entry.push(entry[1].contentType.length);
    } else {
      entry.push(Number.MAX_SAFE_INTEGER);
    }
    return entry;
  });
  entries.sort((a, b) => a[2] - b[2]);

  // Sort links with any attribute set to false higher.
  entries.sort((a, b) => {
    const aHasFalse = Object.values(a[1]).includes(false);
    const bHasFalse = Object.values(b[1]).includes(false);
    if (aHasFalse && !bHasFalse) {
      return -1;
    } else if (!aHasFalse && bHasFalse) {
      return 1;
    }
    return 0;
  });

  return entries.reduce((obj, [k, v]) => {
    obj[k] = v;
    return obj;
  }, {});
};
  

run(argv.url || argv._[0]);