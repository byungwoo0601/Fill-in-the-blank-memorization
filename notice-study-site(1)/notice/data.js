// 기본으로 표시할 문장 데이터입니다.
// 배포 시 모든 사용자에게 처음부터 보이게 할 문장은 cards 배열에 추가하세요.
// 사용자가 브라우저에서 직접 만든 문장은 해당 브라우저의 localStorage에 저장됩니다.
window.NOTICE_DATA = {
  title: "빈칸 암기 노트",
  description: "문장을 직접 만들고 원하는 부분을 빈칸으로 지정해 학습하세요. 빈칸을 클릭하면 정답이 보입니다.",
  storageKey: "notice-cloze-study-v1",
  cards: [
    {
      id: "sample-1",
      title: "예시 문장",
      sentence: "문장을 작성한 뒤 빈칸으로 만들 부분을 드래그해서 선택하세요.",
      blanks: [
        { id: "sample-1-b1", start: 0, end: 2, answer: "문장" },
        { id: "sample-1-b2", start: 10, end: 12, answer: "빈칸" }
      ]
    }
  ]
};
