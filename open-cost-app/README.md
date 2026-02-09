# Open-Cost Master 🍳

**"소상공인을 위한, 평생 무료 원가 관리 시스템"**

Open-Cost Master는 복잡한 엑셀 없이도 식당/카페의 원가(Cost), 레시피(Recipe), 마진율(Margin)을 쉽고 정확하게 관리할 수 있는 웹 애플리케이션입니다.

## ✨ 주요 기능 (Key Features)

1.  **💰 원가 관리 (Cost Management)**
    -   구매 단위(kg, box)와 사용 단위(g, ea) 자동 환산.
    -   **로스율(Loss Rate)**을 반영한 '진짜 원가' 자동 계산.
    -   재료 히스토리 및 가격 변동 추적.

2.  **📝 메뉴 엔지니어링 (Recipe Engineering)**
    -   직관적인 **레시피 빌더**: 클릭 몇 번으로 메뉴 구성.
    -   **실시간 마진 시뮬레이션**: 재료를 넣을 때마다 원가와 이익률(%)이 즉시 계산됨.
    -   목표 원가율 설정 및 경고 알림.

3.  **📊 스마트 대시보드 (Dashboard)**
    -   매장의 현재 메뉴 현황, 평균 마진율, 최근 입고 재료 등을 한눈에 파악.
    -   모바일 친화적(Mobile-First) 디자인으로 주방에서도 확인 가능.

## 🛠 기술 스택 (Tech Stack)

-   **Framework**: Next.js 14+ (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS + ShadcnUI (Zero-Cost Design)
-   **Database**: Supabase (PostgreSQL)
-   **Auth**: Supabase Auth

---

## 🚀 시작하기 (Getting Started)

내 컴퓨터에서 직접 실행하여 테스트해볼 수 있습니다.

### 1. 설치 (Installation)
프로젝트 폴더로 이동하여 필요한 패키지를 설치합니다.
```bash
npm install
```

### 2. 실행 (Run)
개발 서버를 실행합니다.
```bash
npm run dev
```

### 3. 접속
브라우저를 열고 아래 주소로 접속하세요.
[http://localhost:3000](http://localhost:3000)

---

## 📂 프로젝트 구조

```
src/
├── app/              # 페이지 및 라우팅 (Next.js App Router)
│   ├── ingredients/  # 재료 관리 페이지
│   ├── recipes/      # 메뉴(레시피) 관리 페이지
│   └── page.tsx      # 대시보드 (메인)
├── components/       # 재사용 가능한 UI 컴포넌트
│   ├── ui/           # 버튼, 카드 등 기본 UI
│   ├── calendar/     # 달력 위젯 (예정)
│   └── ...
├── hooks/            # 비즈니스 로직 (Custom Hooks)
├── lib/              # 유틸리티 및 설정 (Supabase 등)
└── types/            # TypeScript 타입 정의
```

## 📄 라이선스
MIT License
