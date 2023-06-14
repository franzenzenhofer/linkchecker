/**
 * Checks if the link's URL matches the canonical header URL.
 * @param {string} lnk - The link URL.
 * @param {object} linkData - The link data object.
 */
const checkCanonicalHeaderMatch = (lnk, linkData) => {
  if (linkData.canonicalHeader) {
    const parsedUrl = new URL(lnk);
    const urlWithoutAnchor = parsedUrl.origin + parsedUrl.pathname + parsedUrl.search;
    linkData.canonicalHeaderMatch = urlWithoutAnchor === linkData.canonicalHeader;
    if (!linkData.canonicalHeaderMatch) {
      console.log(`Canonical header check failed for ${lnk}`);
    }
  }
};

/**
 * Checks if the link's URL matches the canonical static URL.
 * @param {string} lnk - The link URL.
 * @param {object} linkData - The link data object.
 */
const checkCanonicalStaticMatch = (lnk, linkData) => {
  if (linkData.canonicalStatic) {
    const parsedUrl = new URL(lnk);
    const urlWithoutAnchor = parsedUrl.origin + parsedUrl.pathname + parsedUrl.search;
    linkData.canonicalStaticMatch = urlWithoutAnchor === linkData.canonicalStatic;
    if (!linkData.canonicalStaticMatch) {
      console.log(`Canonical static check failed for ${lnk}`);
    }
  }
};

/**
 * Checks if the link's URL matches the rendered canonical URL.
 * @param {string} lnk - The link URL.
 * @param {object} linkData - The link data object.
 */
const checkRenderedCanonicalMatch = (lnk, linkData) => {
  if (linkData.canonicalRendered) {
    const parsedUrl = new URL(lnk);
    const urlWithoutAnchor = parsedUrl.origin + parsedUrl.pathname + parsedUrl.search;
    linkData.renderedCanonicalMatch = urlWithoutAnchor === linkData.canonicalRendered;
    if (!linkData.renderedCanonicalMatch) {
      console.log(`Rendered canonical check failed for ${lnk}`);
    }
  }
};

/**
 * Checks if the link's static title matches the rendered title.
 * @param {object} linkData - The link data object.
 * @param {string} lnk - The link URL.
 */
const checkTitleMatch = (linkData, lnk) => {
  if (linkData.titleRendered && linkData.titleStatic) {
    linkData.titleMatch = linkData.titleStatic === linkData.titleRendered;
    if (!linkData.titleMatch) {
      console.log(`Title check failed for ${lnk}`);
    }
  }
};

/**
 * Checks if the link's static canonical URL matches the rendered canonical URL.
 * @param {object} linkData - The link data object.
 * @param {string} lnk - The link URL.
 */
const checkCanonicalMatch = (linkData, lnk) => {
  if (linkData.canonicalRendered && linkData.canonicalStatic) {
    linkData.canonicalMatch = linkData.canonicalStatic === linkData.canonicalRendered;
    if (!linkData.canonicalMatch) {
      console.log(`Canonical check failed for ${lnk}`);
    }
  }
};

/**
 * Checks if the link has an SEO title.
 * @param {string} lnk - The link URL.
 * @param {object} linkData - The link data object.
 */
const checkSEOTitleMatch = (lnk, linkData) => {
  if (linkData.contentType && linkData.contentType.includes('html')) {
    linkData.hasSEOTitle = Boolean(linkData.titleStatic);
    if (!linkData.hasSEOTitle) {
      console.log(`SEO title check failed for ${lnk}`);
    }
  }
};

/**
 * Analyzes the link status object and updates the link data objects with the results of each check.
 * @param {object} ls - The link status object.
 * @returns {object} - The updated link status object.
 */
const analyzeLinkStatus = ls => {
  for (let [lnk, linkData] of Object.entries(ls)) {
    checkCanonicalHeaderMatch(lnk, linkData);
    checkCanonicalStaticMatch(lnk, linkData);
    checkRenderedCanonicalMatch(lnk, linkData);
    checkTitleMatch(linkData, lnk);
    checkCanonicalMatch(linkData, lnk);
    checkSEOTitleMatch(lnk, linkData);
  }
  return ls;
};

export default analyzeLinkStatus;