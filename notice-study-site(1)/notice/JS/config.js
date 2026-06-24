const STORAGE_KEY = "cloze-study-demo-cards-v1";
const MEMO_KEY = "cloze-study-demo-memo-v1";
const PHOTO_KEY = "cloze-study-demo-source-photo-v1";
const OCR_TEXT_KEY = "cloze-study-demo-ocr-text-v1";
const SOURCE_META_KEY = "cloze-study-demo-source-meta-v1";
const MODE_KEY = "cloze-study-demo-mode-v1";
const SESSION_KEY = "cloze-study-demo-session-v1";
const SEARCH_KEY = "cloze-study-demo-search-v1";
const SETS_KEY = "cloze-study-demo-sets-v1";
const ACTIVE_SET_KEY = "cloze-study-demo-active-set-v1";
const DEFAULT_SET_ID = "default";
const ALL_SETS_ID = "all";

const demoMain =
  "누리과정은 3~5세 유아를 위한 [[국가 수준]]의 공통 교육과정이다.";
const demoLines = [
  {
    type: "bullet",
    text: "개정 누리과정은 [[성격]] 항목을 신설하여 누리과정을 3~5세 유아를 위한 [[국가 수준]]의 공통 교육과정으로 정의하였다.",
  },
  {
    type: "bullet",
    text: "[[국가 수준]]의 공통 교육과정으로서 누리과정은 3~5세 유아가 다니는 유치원과 어린이집에서 누리과정을 운영할 때 우선적으로 고려해야 할 [[공통적]]이고 [[일반적]]인 기준을 국가가 고시한 것이다.",
  },
  {
    type: "bullet",
    text: "유치원과 어린이집에 다니는 3~5세 유아는 [[국가 수준]]의 교육과정에서 제시하는 기준에 따라 [[차별]] 없이 양질의 [[교육적 경험]]을 할 수 있게 된다.",
  },
  {
    type: "heading",
    text: "가. [[국가 수준]]의 공통성과 [[지역·기관·개인 수준]]의 다양성을 동시에 추구한다.",
  },
  {
    type: "sub",
    text: "[[국가]] 수준의 공통성은 유치원과 어린이집에서 교육과정을 구성하고 운영할 때 고려해야 할 [[공통적]]이고 [[일반적]] 기준을 의미한다.",
  },
  {
    type: "sub",
    text: "[[지역]] 수준의 다양성은 [[국가]] 수준의 교육과정을 바탕으로 각 시·도 교육청이나 시·군·구청에서 그 지역사회의 [[특성]]과 [[여건]]을 고려하여 누리과정을 [[융통성]]있게 운영하는 것을 의미한다.",
  },
  {
    type: "sub",
    text: "[[기관]] 수준의 다양성은 각 유치원과 어린이집이 [[국가]] 수준 교육과정과 [[지역]] 수준 교육과정의 특성을 반영하는 동시에 각 [[기관]]의 철학, 학급(반) 및 학부모의 특성에 따라 누리과정을 [[자율적]]으로 운영하는 것을 의미한다.",
  },
  {
    type: "sub",
    text: "[[개인]] 수준의 다양성은 교사가 담당 학급(반) 유아의 연령 및 개별 특성, 발달 수준 등 [[유아의 특성]]을 교육과정에 반영하여 운영하는 것을 의미한다.",
  },
];
