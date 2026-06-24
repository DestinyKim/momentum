# Momentum — 배포 가이드

올인원 개인 대시보드(React + Vite). 백엔드 없이 동작하며, 데이터는 **브라우저 localStorage**에 저장됩니다.
- 의존성: react, react-dom, lucide-react (Tailwind/백엔드 불필요)
- 스타일·폰트는 컴포넌트 안에 포함되어 별도 설정이 필요 없습니다.

---

## 1) 로컬에서 실행해보기 (Node.js 18+ 필요)
```bash
npm install
npm run dev      # http://localhost:5173 에서 미리보기 (여기선 localStorage 저장이 실제로 동작)
```

## 2) 프로덕션 빌드
```bash
npm run build    # 결과물이 dist/ 폴더에 생성됨
```

---

## 3) 배포 방법 (셋 중 택1)

### A. Netlify Drop — 가장 쉬움 (Git/터미널 추가 작업 없음)
1. `npm run build` 로 `dist/` 폴더를 만든다.
2. https://app.netlify.com/drop 접속.
3. `dist` 폴더를 페이지에 **드래그&드롭**.
4. 몇 초 뒤 `https://...netlify.app` 주소로 바로 공개됨 (HTTPS 자동).

### B. Vercel — Git 연동 (수정 시 자동 재배포)
1. 이 폴더를 GitHub 저장소에 올린다.
2. https://vercel.com 에서 New Project → 저장소 선택.
3. Vite 자동 감지 (Build: `npm run build`, Output: `dist`). Deploy 클릭.
4. 공개 URL 발급 + 이후 `git push` 할 때마다 자동 갱신.

### C. 터미널 없이 처음부터 (브라우저만)
- https://stackblitz.com 또는 https://bolt.new 에서 Vite + React 프로젝트를 만들고
  `src/App.jsx`, `src/main.jsx`, `package.json` 내용을 붙여넣으면 바로 라이브 URL이 나옵니다.

> 무료 한도(참고): Netlify ≈ 월 300 빌드분 / 100GB 트래픽, Vercel Hobby는 개인용 무료.

---

## ⚠️ 꼭 알아둘 점 — 데이터 저장 방식
- 현재 데이터는 **그 브라우저/기기 한 곳에만** 저장됩니다.
  - 다른 기기·다른 브라우저에서는 데이터가 보이지 않습니다(동기화 X).
  - 브라우저 캐시/사이트 데이터를 지우면 함께 삭제됩니다.
  - 이미지는 업로드 시 자동 압축되지만, 너무 많이 넣으면 localStorage 한도(약 5MB)를 넘을 수 있으니 큰 이미지는 'URL 붙여넣기'를 권장합니다.
- 여러 기기 동기화·로그인·안전한 백업이 필요해지면 **Supabase**(무료 시작) 같은 백엔드를 붙이고,
  `usePersistentState` 부분을 DB 호출로 바꾸면 됩니다. 이미지도 Supabase Storage에 올리고 URL만 저장하세요.

## (선택) 휴대폰에서 앱처럼 쓰기
배포된 주소를 모바일 브라우저로 연 뒤 '홈 화면에 추가'하면 앱처럼 전체화면으로 실행됩니다.
