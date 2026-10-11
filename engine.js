/* ===== ENGINE START ===== */
const ABBR = new Set(['mr','mrs','ms','dr','prof','sr','jr','st','vs','etc','e.g','i.e','cf','al','approx','fig','figs','no','nos','vol','pp','p','inc','ltd','co','corp','dept','est','a.m','p.m','u.s','u.k','u.s.a','mt','ave','jan','feb','mar','apr','jun','jul','aug','sep','sept','oct','nov','dec','ph.d','b.a','m.a','b.s','m.s','gen','gov','sen','rep','rev','capt','lt','sgt','col']);

const CONTRACTIONS = {
  dont:"don't", doesnt:"doesn't", didnt:"didn't", cant:"can't", couldnt:"couldn't", shouldnt:"shouldn't",
  wouldnt:"wouldn't", isnt:"isn't", wasnt:"wasn't", arent:"aren't", werent:"weren't", havent:"haven't",
  hasnt:"hasn't", hadnt:"hadn't", mustnt:"mustn't", neednt:"needn't", im:"I'm", ive:"I've",
  youre:"you're", youve:"you've", youll:"you'll", youd:"you'd", theyre:"they're", theyve:"they've",
  theyll:"they'll", theyd:"they'd", weve:"we've", itll:"it'll", thatll:"that'll", wouldve:"would've",
  couldve:"could've", shouldve:"should've", mightve:"might've", mustve:"must've", thats:"that's",
  whats:"what's", wheres:"where's", theres:"there's", heres:"here's", hes:"he's", shes:"she's",
  whos:"who's", arent_:"aren't", aint:"ain't"
};
delete CONTRACTIONS.arent_;

const FUSED = { alot:'a lot', everytime:'every time', eachother:'each other', infront:'in front', incase:'in case',
  atleast:'at least', aswell:'as well', noone:'no one', thankyou:'thank you', irregardless:'regardless', alright_:'' };
delete FUSED.alright_;

const PROPER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday','january','february','april',
  'june','july','august','september','october','november','december','english','spanish','french','german',
  'italian','chinese','japanese','korean','russian','arabic','portuguese','hindi','latin','greek','american',
  'british','canadian','mexican','european','african','asian','australian','christmas','thanksgiving','halloween',
  'easter','america','europe','africa','asia','canada','mexico','england','france','germany','italy','spain',
  'russia','australia','japan','korea','christian','muslim','jewish','hindu','buddhist','islam','christianity',
  'judaism','hinduism','buddhism','shakespeare','internet_'].filter(w => !w.endsWith('_'));

const INTRO = ['on the other hand','in other words','first of all','as a result','in conclusion','in addition',
  'in contrast','for example','for instance','in summary','to summarize','to conclude','by contrast','in fact',
  'of course','after all','however','therefore','furthermore','moreover','additionally','consequently',
  'nevertheless','nonetheless','meanwhile','finally','firstly','secondly','thirdly','lastly','unfortunately',
  'fortunately','ultimately','similarly','likewise','otherwise','instead','indeed','besides'];
const INTRO_RE = new RegExp('^(' + INTRO.join('|').replace(/ /g, '[ \\t]+') + ')(?=[ \\t]+([A-Za-z\'’]+))', 'i');
const INTRO_SKIP = {
  however: ['much','many','long','far','hard','often','little','big','small','few','good','bad','well','difficult','strange'],
  instead: ['of'], 'in addition': ['to'], 'in contrast': ['to','with'], 'as a result': ['of'], 'by contrast': ['to','with'],
  'of course': ['not'], besides: ['the','a','an','that','this','being','my','your','his','her','our','their']
};

const AUX_BEFORE_HAVE = new Set(['did','does','do','would','could','should','will','can','may','might','must','to','shall',
  "didn't","doesn't","don't","won't","wouldn't","couldn't","shouldn't","can't","let","make","made","help","helps","had","why"]);

function caseLike(orig, rep) {
  if (orig.length > 1 && orig === orig.toUpperCase() && /[A-Z]/.test(orig)) return rep.toUpperCase();
  if (/^[A-Z]/.test(orig)) return rep[0].toUpperCase() + rep.slice(1);
  return rep;
}
function prevWord(text, i) { const m = text.slice(Math.max(0, i - 40), i).match(/([A-Za-z'’]+)\s*$/); return m ? m[1].toLowerCase().replace('’', "'") : ''; }

function wantsAn(w) {
  const l = w.toLowerCase();
  if (/^(hour|honest|honor|honour|heir)/.test(l)) return true;
  if (/^(uni(?![nmd])|use|usu|uti|uto|ura|uri|euro|eu|ewe|one(?![a-z])|ones(?![a-z])|once|ubiq|uku|unanim|uvu)/.test(l)) return false;
  return /^[aeiou]/.test(l);
}

// Phrase rules: the replacement applies to capture group 1.
const PHRASES = [
  { re: /\b(?:could|would|should|must|might)\s+(of)\b(?!\s+course)/gid, rep: () => 'have', cat: 'grammar',
    title: 'Use “have”, not “of”', msg: '“Could of” is a mishearing of “could’ve”. Write “could have”, “should have”, “would have”.' },
  { re: /\b(your)\s+(?=welcome\s*(?:[.!,]|$))/gid, rep: () => "you're", cat: 'grammar',
    title: 'Use “you’re”', msg: '“You’re” means “you are”. “Your” shows ownership.' },
  { re: /\b(your)\s+(?=(?:going\s+to|gonna|not|so)\b)/gid, rep: () => "you're", cat: 'grammar',
    title: 'Use “you’re”', msg: '“You’re” means “you are”. “Your” shows ownership.' },
  { re: /\b(its)\s+(?=(?:a|an|the|been|not|going|getting|gonna|my|your|our|their|his|her|because|okay|ok)\b)/gid,
    rep: () => "it's", cat: 'grammar', title: 'Use “it’s”', msg: '“It’s” means “it is” or “it has”. “Its” (no apostrophe) shows ownership.' },
  { re: /\b(it['’]s)\s+own\b/gid, rep: () => 'its', cat: 'grammar',
    title: 'Use “its”', msg: '“Its” (no apostrophe) shows ownership: “its own”.' },
  { re: /\b(their)\s+(?=(?:is|are|was|were)\b)/gid, rep: () => 'there', cat: 'grammar',
    title: 'Use “there”', msg: '“There is” and “there are” use “there”. “Their” shows ownership.' },
  { re: /\b(?:more|less|better|worse|rather|greater|fewer|bigger|smaller|larger|faster|slower|older|younger|higher|lower|easier|harder|longer|shorter|stronger|weaker|other)\s+(then)\b/gid,
    rep: () => 'than', cat: 'grammar', title: 'Use “than”', msg: 'Comparisons use “than”. “Then” is about time.' },
  { re: /(?:\b(?:am|is|are|was|were|be|been|not)|['’](?:re|s|m))\s+(suppose)\s+to\b/gid, rep: () => 'supposed', cat: 'grammar',
    title: 'Use “supposed to”', msg: 'The phrase is “supposed to”, with a d.' },
  { re: /\bfor all (intensive purposes)\b/gid, rep: () => 'intents and purposes', cat: 'grammar',
    title: 'Use “intents and purposes”', msg: 'The phrase is “for all intents and purposes”.' },
  { re: /\b(?:he|she|it)\s+(don['’]?t)\b/gid, rep: () => "doesn't", cat: 'grammar',
    title: 'Use “doesn’t”', msg: 'He, she and it take “doesn’t”: “she doesn’t know”.' },
  { re: /\b(?:you|we|they)\s+(was)\b/gid, rep: () => 'were', cat: 'grammar',
    title: 'Use “were”', msg: 'You, we and they take “were”.' },
  { re: /\b(?:you|we|they)\s+(is)\b/gid, rep: () => 'are', cat: 'grammar',
    title: 'Use “are”', msg: 'You, we and they take “are”.' },
  { re: /\b(?:he|she|it)\s+(are)\b/gid, rep: () => 'is', cat: 'grammar',
    title: 'Use “is”', msg: 'He, she and it take “is”.' },
  { re: /\b(?:he|she|it)\s+(have)\b/gid, rep: () => 'has', cat: 'grammar', skip: (t, m) => AUX_BEFORE_HAVE.has(prevWord(t, m.index)),
    title: 'Use “has”', msg: 'He, she and it take “has”: “he has a test”.' },
  { re: /\bbetween\s+(?:you|him|her|them|us)\s+and\s+(I)\b/gid, rep: () => 'me', cat: 'grammar',
    title: 'Use “me”', msg: 'After words like “between”, use “me”: “between you and me”.' },
  { re: /\b(?:for|with|to|from|like)\s+(?:you|him|her|them|us)\s+and\s+(I)\b(?=\s*(?:[.,!?;]|$))/gid, rep: () => 'me', cat: 'grammar',
    title: 'Use “me”', msg: 'After words like “for”, “with” and “to”, use “me”.' },
  { re: /\b(?:to|will|would|could|might|not|never|gonna|don['’]t|didn['’]t|won['’]t|can['’]t)\s+(loose)\b/gid, rep: () => 'lose', cat: 'grammar',
    title: 'Use “lose”', msg: '“Lose” is the verb (to lose a game). “Loose” means not tight.' },
  { re: /\b(?:the|an)\s+(affect)\s+(?=(?:of|on)\b)/gid, rep: () => 'effect', cat: 'grammar',
    title: 'Use “effect”', msg: '“Effect” is usually the noun (the effect of). “Affect” is usually the verb.' },
  { re: /\b(i\.e|e\.g)(?![.\w])/gid, rep: m => m[1] + '.', cat: 'punct',
    title: 'Add the final period', msg: '“i.e.” and “e.g.” each take two periods.' },
  { re: /\b(etc)(?![.\w])/gid, rep: m => m[1] + '.', cat: 'punct',
    title: 'Add a period after “etc.”', msg: '“Etc.” is an abbreviation and always takes a period.' },
];

function sentenceStarts(text) {
  const starts = new Set();
  for (const m of text.matchAll(/(^|\n)[ \t]*(?:(?:[-*•]|\d+[.)])[ \t]+)?[“"‘'(\[]*(?=[A-Za-z])/g)) starts.add(m.index + m[0].length);
  for (const m of text.matchAll(/([.!?…]+)([”"’')\]]*)[ \t]+[“"‘'(\[]*(?=[A-Za-z])/g)) {
    const p = m[1], close = m[2];
    if (p.includes('…') || /\.\./.test(p)) continue;
    if (/[!?]/.test(p) && /[”"’']/.test(close)) continue; // "Why?" she asked.
    if (p.endsWith('.') && !/[!?]/.test(p)) {
      const before = text.slice(0, m.index);
      if (/\d$/.test(before)) continue;
      const tok = (before.match(/([A-Za-z][A-Za-z.]*)$/) || [])[1] || '';
      if (tok && (tok.length === 1 || ABBR.has(tok.toLowerCase()))) continue;
    }
    starts.add(m.index + m[0].length);
  }
  return starts;
}

function check(text) {
  const out = [];
  const add = (s, e, rep, cat, rule, title, msg) => out.push({ s, e, rep, cat, rule, title, msg, orig: text.slice(s, e), order: out.length });

  const skipRanges = [];
  for (const m of text.matchAll(/\b(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w-]+\.[\w.-]+|`[^`\n]*`/g)) skipRanges.push([m.index, m.index + m[0].length]);

  const starts = sentenceStarts(text);

  // Capitalize sentence starts + comma after introductory words
  for (const i of starts) {
    const w = (text.slice(i).match(/^[A-Za-z][\w'’-]*/) || [''])[0];
    const after = text.slice(i + w.length, i + w.length + 2);
    if (/^[a-z]/.test(w) && !/[A-Z]/.test(w.slice(1)) && !/^\.[a-z]/i.test(after) && after[0] !== '@') {
      add(i, i + 1, w[0].toUpperCase(), 'caps', 'sent-cap', 'Capitalize the first word', 'Every sentence starts with a capital letter.');
    }
    const im = text.slice(i, i + 40).match(INTRO_RE);
    if (im) {
      const phrase = im[1].toLowerCase().replace(/\s+/g, ' ');
      const next = im[2].toLowerCase();
      if (!(INTRO_SKIP[phrase] || []).includes(next)) {
        const end = i + im[1].length;
        const lastWord = im[1].match(/[A-Za-z]+$/)[0];
        add(end - lastWord.length, end, lastWord + ',', 'punct', 'intro-comma', `Add a comma after “${im[1].replace(/\s+/g, ' ')}”`,
          'Put a comma after an opening word or phrase like this one.');
      }
    }
  }

  // Lowercase "i"
  for (const m of text.matchAll(/(^|[^\w'’.\-\/@(])i(?=$|[\s,.!?;:'’")\]])/g)) {
    const i = m.index + m[1].length;
    if (text.slice(i + 1, i + 3) === '.e') continue;
    add(i, i + 1, 'I', 'caps', 'cap-i', 'Capitalize “I”', 'The word “I” is always capitalized.');
  }

  // Proper nouns
  const properRe = new RegExp('\\b(' + PROPER.join('|') + ')\\b', 'g');
  for (const m of text.matchAll(properRe)) {
    const pc = text[m.index - 1] || '', nc = text.slice(m.index + m[0].length, m.index + m[0].length + 2);
    if (/[.\/@#_-]/.test(pc) || /^[.@][a-z]/i.test(nc) || nc[0] === '_') continue;
    add(m.index, m.index + 1, m[0][0].toUpperCase(), 'caps', 'proper', `Capitalize “${m[0][0].toUpperCase() + m[0].slice(1)}”`,
      'Days, months, holidays, languages, nationalities and religions are capitalized.');
  }

  // Caps-lock slip: THe, WHen
  for (const m of text.matchAll(/\b([A-Z]{2})([a-z]{2,})\b/g)) {
    add(m.index, m.index + m[0].length, m[1][0] + m[1][1].toLowerCase() + m[2], 'caps', 'two-caps', 'Fix capitalization', 'Only the first letter of this word should be a capital.');
  }

  // a / an
  for (const m of text.matchAll(/\b(an?)([ \t]+)([A-Za-z][\w'’-]*)/gi)) {
    const art = m[1], word = m[3];
    if (art === 'A' && !starts.has(m.index)) continue; // "Plan A or B"
    if (art === 'AN') continue;
    if (word.length < 2 || word === word.toUpperCase()) continue;
    const want = wantsAn(word) ? 'an' : 'a';
    if (art.toLowerCase() !== want) {
      add(m.index, m.index + art.length, caseLike(art, want), 'grammar', 'a-an', `Use “${want}”`,
        want === 'an' ? 'Use “an” before a vowel sound: an apple, an hour.' : 'Use “a” before a consonant sound: a car, a university.');
    }
  }

  // Repeated words
  const REPEAT_OK = new Set(['had', 'that', 'is', 'bye', 'ha', 'no', 'do', 'knock', 'tsk', 'very_']);
  for (const m of text.matchAll(/\b([A-Za-z]+)([ \t]+)\1\b/gi)) {
    if (REPEAT_OK.has(m[1].toLowerCase())) continue;
    const s = m.index + m[1].length;
    add(s, m.index + m[0].length, '', 'grammar', 'repeat', 'Remove the repeated word', `“${m[1]}” appears twice in a row.`);
  }

  // Missing apostrophes
  const conRe = new RegExp('\\b(' + Object.keys(CONTRACTIONS).join('|') + ')\\b(?![\'’])', 'gi');
  for (const m of text.matchAll(conRe)) {
    const w = m[0];
    if (w === 'IM' || w === 'Ill') continue;
    const fix = CONTRACTIONS[w.toLowerCase()];
    const rep = /^I'/.test(fix) ? (w === w.toUpperCase() && w.length > 1 ? fix.toUpperCase() : fix) : caseLike(w, fix);
    add(m.index, m.index + w.length, rep, 'punct', 'apostrophe', 'Add an apostrophe', `“${fix}” is a contraction and needs an apostrophe.`);
  }

  // Fused words
  const fusedRe = new RegExp('\\b(' + Object.keys(FUSED).join('|') + ')\\b', 'gi');
  for (const m of text.matchAll(fusedRe)) {
    const fix = FUSED[m[0].toLowerCase()];
    const isIrr = m[0].toLowerCase() === 'irregardless';
    add(m.index, m.index + m[0].length, caseLike(m[0], fix), 'grammar', 'fused', isIrr ? 'Use “regardless”' : `Write “${fix}”`,
      isIrr ? '“Irregardless” is not standard English. Use “regardless”.' : `“${fix}” is written as two words.`);
  }

  // Phrase rules
  for (const r of PHRASES) {
    for (const m of text.matchAll(r.re)) {
      if (r.skip && r.skip(text, m)) continue;
      const [s, e] = m.indices[1];
      add(s, e, caseLike(m[1], r.rep(m)), r.cat, 'phrase', r.title, r.msg);
    }
  }

  // Space before punctuation
  for (const m of text.matchAll(/([ \t]+)([,.!?;:%])/g)) {
    const s = m.index, p = m[2], nextc = text[s + m[0].length] || '';
    if (s === 0 || text[s - 1] === '\n') continue;
    if (p === '.' && (nextc === '.' || /\d/.test(nextc) || /[a-z]/i.test(nextc))) continue;
    if (p === ':' && /[)(DPp3\/|O]/.test(nextc)) continue;
    if (p === ',' && nextc === ',') continue;
    add(s, s + m[0].length, p, 'punct', 'space-before', `Remove the space before “${p}”`, 'Punctuation marks sit right after the word, with no space before them.');
  }

  // Missing space after punctuation
  for (const m of text.matchAll(/([,;!?])(?=[A-Za-z])/g)) {
    if (/[!?]/.test(m[1]) && /[A-Za-z]/.test(text[m.index - 1] || '') === false) continue;
    add(m.index, m.index + 1, m[1] + ' ', 'punct', 'space-after', `Add a space after “${m[1]}”`, 'Put one space after a comma, semicolon, question mark or exclamation point.');
  }
  for (const m of text.matchAll(/([a-z]{2,}|[a-z]\)|[a-z]["”’])\.(?=[A-Z][a-z])/g)) {
    const i = m.index + m[1].length;
    add(i, i + 1, '. ', 'punct', 'space-after', 'Add a space after the period', 'Put a space between the end of one sentence and the start of the next.');
  }
  for (const m of text.matchAll(/([a-z]):(?=[A-Z][a-z])/g)) {
    const i = m.index + 1;
    add(i, i + 1, ': ', 'punct', 'space-after', 'Add a space after the colon', 'Put one space after a colon.');
  }

  // Extra spaces between words
  for (const m of text.matchAll(/(?<=\S)( {2,})(?=\S)/g)) {
    add(m.index, m.index + m[0].length, ' ', 'punct', 'double-space', 'Remove the extra space', 'Use a single space between words and after sentences.');
  }

  // Spaces inside parentheses
  for (const m of text.matchAll(/\(([ \t]+)/g)) add(m.index + 1, m.index + m[0].length, '', 'punct', 'paren-space', 'Remove the space after “(”', 'No space goes just inside a parenthesis.');
  for (const m of text.matchAll(/(?<=\S)([ \t]+)\)/g)) add(m.index, m.index + m[1].length, '', 'punct', 'paren-space', 'Remove the space before “)”', 'No space goes just inside a parenthesis.');

  // Repeated punctuation
  for (const m of text.matchAll(/,{2,}|;{2,}|:{2,}/g)) add(m.index, m.index + m[0].length, m[0][0], 'punct', 'repeat-punct', `Use one “${m[0][0]}”`, 'This punctuation mark is typed more than once.');
  for (const m of text.matchAll(/(?<!\.)\.\.(?!\.)/g)) add(m.index, m.index + 2, '.', 'punct', 'repeat-punct', 'Use one period', 'Use a single period, or three dots (…) for an ellipsis.');
  for (const m of text.matchAll(/\.{4,}/g)) add(m.index, m.index + m[0].length, '...', 'punct', 'repeat-punct', 'Use three dots', 'An ellipsis has exactly three dots.');
  for (const m of text.matchAll(/!{2,}|\?{2,}/g)) add(m.index, m.index + m[0].length, m[0][0], 'punct', 'repeat-punct', `Use one “${m[0][0]}”`, 'Formal writing uses a single question mark or exclamation point.');

  // Per-line checks: end punctuation, unmatched brackets and quotes
  let off = 0;
  for (const line of text.split('\n')) {
    const t = line.replace(/\s+$/, '');
    const words = t.trim() ? t.trim().split(/\s+/).length : 0;
    if (words >= 6 && /[A-Za-z0-9]$/.test(t) && !/^\s*(?:[-*•]|\d+[.)])\s/.test(line)) {
      const lw = t.match(/[\w'’]+$/)[0];
      add(off + t.length - lw.length, off + t.length, lw + '.', 'punct', 'end-punct', 'Add end punctuation', 'This sentence needs a period, question mark or exclamation point at the end.');
    }
    const stack = []; let badClose = -1;
    for (let k = 0; k < line.length; k++) {
      if (line[k] === '(') stack.push(k);
      else if (line[k] === ')') { if (stack.length) stack.pop(); else if (/\s|^/.test(line[k - 1] || ' ') || k === 0 || badClose < 0) { if (!/^\s*[a-z0-9]$/i.test(line.slice(0, k))) badClose = badClose < 0 ? k : badClose; } }
    }
    if (stack.length) add(off + stack[0], off + stack[0] + 1, null, 'punct', 'unmatched', 'Unclosed parenthesis', 'This “(” has no matching “)”.');
    else if (badClose >= 0) add(off + badClose, off + badClose + 1, null, 'punct', 'unmatched', 'Extra closing parenthesis', 'This “)” has no matching “(”.');
    const dq = [...line.matchAll(/"/g)];
    if (dq.length % 2) { const k = dq[dq.length - 1].index; add(off + k, off + k + 1, null, 'punct', 'unmatched', 'Unmatched quotation mark', 'Quotation marks come in pairs. One is missing its partner.'); }
    const oq = (line.match(/“/g) || []).length, cq = (line.match(/”/g) || []).length;
    if (oq !== cq) { const k = oq > cq ? line.lastIndexOf('“') : line.lastIndexOf('”'); add(off + k, off + k + 1, null, 'punct', 'unmatched', 'Unmatched quotation mark', 'Quotation marks come in pairs. One is missing its partner.'); }
    off += line.length + 1;
  }

  // Filter, dedupe, resolve overlaps (earlier rules win at the same position)
  const inSkip = x => skipRanges.some(([a, b]) => x.s < b && a < x.e);
  const cands = out.filter(x => x.rep !== x.orig && !inSkip(x)).sort((a, b) => a.s - b.s || a.order - b.order);
  const kept = [];
  for (const x of cands) {
    if (kept.some(k => x.s < k.e && k.s < x.e)) continue;
    kept.push(x);
  }
  return kept;
}

function applyFixes(text, issues) {
  let res = text;
  for (const x of [...issues].filter(x => x.rep !== null).sort((a, b) => b.s - a.s)) res = res.slice(0, x.s) + x.rep + res.slice(x.e);
  return res;
}
/* ===== ENGINE END ===== */
