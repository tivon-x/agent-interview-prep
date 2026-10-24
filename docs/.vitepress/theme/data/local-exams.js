export const examStorageKey = "agent-interview-prep:local-exams:v1";
export const maxExamBytes = 2 * 1024 * 1024;
const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
export const papers = [
  { id: "3403", count: 84, max: 108, excluded: [...range(51, 54), ...range(57, 76)] },
  { id: "3308", count: 75, max: 100, excluded: [...range(51, 70), 72, 73, 74, 79, 84] },
  { id: "2045", count: 78, max: 100, excluded: [...range(61, 78), 80, 81, 84, 89] },
  { id: "3307", count: 88, max: 108, excluded: range(51, 70) },
];
export const examScopes = {
  all: Object.fromEntries(papers.map(p => [p.id, null])),
  reasoning: { 3403: [...range(5, 14), ...range(35, 50)] },
  quantitative: { 3403: [...range(15, 34), 55, 56, ...range(77, 84)] },
  technology: { 3403: [...range(1, 4), ...range(91, 108)] },
  culture: { 3403: range(85, 90), 3308: range(91, 100), 2045: range(91, 100), 3307: range(81, 95) },
  sequences: { 3403: range(15, 22), 3308: [...range(11, 20), 80], 2045: [24, 26, 27, 28, 29, 30, 33, 36, 37, 38], 3307: [11, 12, 13, 14, 16, 17, 18, 19] },
  "review-2045": { 2045: null },
  "review-3307": { 3307: null },
};

const culture = "/notes/china-mobile/04-culture";
const sequences = "/notes/china-mobile/number-sequences";
const review2045 = "/notes/china-mobile/2045-review";
const review3307 = "/notes/china-mobile/3307-review";
export const examCorrections = {
  "3403-17": { answer: "A", text: "按乘 4 与减 2、3、4 交替，下一项为 144。网站的 145 与已有减法不一致；有限数列不保证数学上的唯一续项。", link: sequences },
  "3403-30": { answer: "A", text: "重新计算应节约 2.5%，不是网站的 1.5%。", link: "/notes/china-mobile/02-quantitative" },
  "3403-78": { text: "网站给出的编码上界证明不完整，复习资料补充了对任意编码集合成立的证明。", link: "/notes/china-mobile/02-quantitative" },
  "3403-81": { text: "网站给出的编码上界证明不完整，复习资料补充了对任意编码集合成立的证明。", link: "/notes/china-mobile/02-quantitative" },
  "3308-14": { text: "相邻差应为 3、6、12、24，下一差为 48。网站把首差写成 2 是笔误。", link: sequences },
  "2045-11": { answer: null, text: "材料与选项的文意判据有争议，不把网站答案当作已经确认的唯一答案。", link: review2045 },
  "2045-18": { answer: null, text: "省略表达与推断范围有争议，本题暂不作唯一答案判定。", link: review2045 },
  "2045-27": { answer: "A", text: "分母用连续立方减 1、2、4、8 可得到 200。不能先算出 201，再选择最接近的选项。", link: sequences },
  "2045-38": { answer: null, text: "原题第四项是 173，暂不改动。只有假设它误写、应为 113，才能按连续减平方得到 28、B；该修复尚未获出题方确认。", link: sequences },
  "2045-85": { answer: null, text: "按不同简单分类标准，A、B 均有依据，不作为唯一答案题训练。", link: review2045 },
  "2045-87": { answer: "A", text: "9 是合数，替换 7 后破坏全为质数的性质。网站选项 C 提及的 19 未出现在原卡片中。", link: review2045 },
  "2045-94": { answer: "D", text: "三全应为全方位、全过程、全员。网站解析中的全网、全程、全员有误。", link: culture },
  "2045-95": { answer: "B", text: "2025 年半年报支持移动爱家与全方位数智化生活体验的对应，网站 A 与报告原文冲突。", link: culture },
  "2045-97": { answer: "D", text: "按对应的 2025 年讲话，愿景为信息服务科技创新公司，AI 角色为供给者、汇聚者、运营者。网站 C 的愿景表述不采用。", link: culture },
  "3307-15": { answer: "D", text: "数对映射使用两数平方和，5²+4²=41。网站对干扰项 45 的解释不成立，因为 9²=81。", link: review3307 },
  "3307-46": { answer: null, text: "依据紧邻与先后条件，A、B 都能推出，原题不满足单选的唯一性。", link: review3307 },
  "3307-72": { text: "16 种状态只能证明至少三次，还需要可执行的三次称重方案。完整分支见复核说明。", link: review3307 },
  "3307-74": { answer: null, text: "仅要求相邻变一位时，A、D 都成立。补上八个状态互不重复的条件，才唯一选 A。", link: review3307 },
  "3307-79": { text: "中心为 5 需要必要性证明：四条过中心的线求和得到 60=45+3c，因此 c=5。", link: review3307 },
  "3307-81": { answer: "B", text: "官方企业文化页列出的核心价值观为正德厚生、臻于至善，网站 A 错误。", link: culture },
  "3307-88": { answer: "C", text: "2024 年两项收入约为 10408、8895 亿元。网站 B 将上一年的 8635 亿元混入其中。", link: culture },
};

function text(value, max, required = true) {
  if (typeof value !== "string" || value.length > max || (required && !value.trim()))
    throw new Error("题目文件缺少有效文本，或文本过长。");
  return value;
}

export function validateExamBank(value) {
  if (value?.format !== "china-mobile-local-exams" || value.version !== 1 ||
      !Array.isArray(value.papers) || value.papers.length !== papers.length)
    throw new Error("请选择配套的四套卷题目文件，当前文件格式或版本不正确。");
  const seenPapers = new Set();
  const clean = value.papers.map(paper => {
    const spec = papers.find(p => p.id === paper?.id);
    if (!spec || seenPapers.has(paper.id) || !Array.isArray(paper.questions) || paper.questions.length !== spec.count)
      throw new Error("试卷编号、数量或题目数不正确。");
    seenPapers.add(paper.id);
    const seenQuestions = new Set();
    const questions = paper.questions.map(q => {
      if (!Number.isInteger(q?.number) || q.number < 1 || q.number > spec.max ||
          spec.excluded.includes(q.number) || seenQuestions.has(q.number) ||
          !Array.isArray(q.options) || q.options.length !== 4 || !/^[ABCD]$/.test(q.answer))
        throw new Error("原题号、选项或答案格式不正确，图形题也不能混入。");
      seenQuestions.add(q.number);
      const options = q.options.map((option, i) => {
        if (option?.label !== "ABCD"[i]) throw new Error("选项必须按 A、B、C、D 排列。");
        return { label: option.label, text: text(option.text, 10000) };
      });
      return { number: q.number, stem: text(q.stem, 20000), options,
        answer: q.answer, analysis: text(q.analysis, 40000, false) };
    });
    return { id: paper.id, questions: questions.sort((a, b) => a.number - b.number) };
  });
  return { format: "china-mobile-local-exams", version: 1,
    papers: papers.map(spec => clean.find(p => p.id === spec.id)) };
}
