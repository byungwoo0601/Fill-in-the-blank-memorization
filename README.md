# 빈칸 암기 노트 정적 웹페이지 템플릿

문장을 직접 만들고, 사용자가 선택한 부분을 빈칸으로 바꿔 학습하는 정적 웹페이지입니다. 빈칸은 클릭하면 정답이 보이고, 다시 클릭하면 숨겨집니다.

## 구성

```text
notice-study-site/
├─ index.html              # /notice/로 이동
├─ notice/
│  ├─ index.html           # 메인 빈칸 학습 페이지
│  ├─ styles.css           # 디자인
│  ├─ app.js               # 문장 생성/빈칸 토글/저장 로직
│  ├─ data.js              # 기본 문장 데이터
│  └─ complete.svg         # 기존 이미지 파일, 현재 기능에서는 필수 아님
└─ safety/
   └─ index.html           # 7대안전 연결용 빈 페이지
```

## 사용법

1. `/notice/` 페이지를 엽니다.
2. 문장 제목과 원문 문장을 입력합니다.
3. 원문 문장에서 빈칸으로 만들 부분을 마우스로 드래그합니다.
4. `선택 영역을 빈칸으로 만들기`를 누릅니다.
5. 빈칸을 모두 지정한 뒤 `문장 등록`을 누릅니다.
6. 학습 문장에서 빈칸을 클릭하면 정답이 보입니다.

## 데이터 저장 방식

- 사용자가 브라우저에서 만든 문장은 해당 브라우저의 `localStorage`에 저장됩니다.
- 즉, 같은 사이트라도 다른 기기/다른 브라우저에서는 자동 공유되지 않습니다.
- 모든 사용자에게 기본으로 보일 문장을 넣으려면 `notice/data.js`의 `cards` 배열을 수정해야 합니다.

## 기본 문장 추가 예시

```js
window.NOTICE_DATA = {
  title: "빈칸 암기 노트",
  description: "문장을 직접 만들고 원하는 부분을 빈칸으로 지정해 학습하세요.",
  storageKey: "notice-cloze-study-v1",
  cards: [
    {
      id: "law-1",
      title: "예시 제목",
      sentence: "사업주는 근로자의 안전과 건강을 유지·증진하기 위하여 필요한 조치를 하여야 한다.",
      blanks: [
        { id: "law-1-b1", start: 0, end: 3, answer: "사업주" },
        { id: "law-1-b2", start: 8, end: 10, answer: "안전" }
      ]
    }
  ]
};
```

`start`, `end`를 직접 계산하기 번거로우면 웹페이지에서 문장을 만든 뒤 `데이터 내보내기`를 눌러 JSON을 복사하세요. 그 JSON을 `data.js`의 `cards` 값으로 옮기면 됩니다.

## Netlify Drag & Drop 배포

1. https://app.netlify.com/drop 접속
2. `notice-study-site` 폴더를 통째로 드래그 앤 드롭
3. 발급된 주소에서 `/notice/` 경로로 접속

## GitHub Pages 배포

1. GitHub에서 새 Repository를 만듭니다.
2. 이 폴더 안 파일들을 전부 업로드합니다.
3. Repository → Settings → Pages로 이동합니다.
4. Source를 `Deploy from a branch`, Branch를 `main`, Folder를 `/root`로 설정합니다.
5. 저장 후 `https://아이디.github.io/레포명/notice/`로 접속합니다.

## 현재 한계

- 정적 사이트라서 로그인, 서버 DB, 사용자 간 자동 동기화는 없습니다.
- 브라우저 저장 데이터는 사용자가 캐시/사이트 데이터를 삭제하면 사라질 수 있습니다.
- 정답을 절대 숨겨야 하는 서비스라면 서버/API/DB가 필요합니다.
