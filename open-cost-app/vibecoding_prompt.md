# Open-Cost Master: 프로젝트 코딩 규칙 (Coding Standards)
본 문서는 Open-Cost Master 프로젝트의 일관성 있는 유지보수와 AI 기반 개발(Anti-Gravity/Vibe Coding)의 효율성을 극대화하기 위한 표준 코딩 규칙을 정의합니다.

## 1. 공통 원칙 (General Principles)
- **AI 친화적 코드 (AI-Ready)**: 모든 함수와 복잡한 로직은 AI가 맥락을 쉽게 파악할 수 있도록 명확한 주석과 서술적인 이름을 사용한다.
- **Zero-Cost 지향**: 외부 유료 라이브러리 도입을 지양하고, 오픈소스 또는 브라우저 표준 API를 우선적으로 사용한다.
- **단일 파일 mandate**: 특정 기능 단위(예: 대시보드 메인)는 가급적 하나의 `.jsx` 또는 `.tsx` 파일에 모든 로직(UI, State, Logic)을 응축하여 AI의 컨텍스트 파악을 돕는다.

## 2. 프론트엔드: React & Next.js
### 2.1 명명 규칙 (Naming Conventions)
- **컴포넌트**: `PascalCase`를 사용한다. (예: `ProductList`, `InventoryCard`)
- **변수 및 함수**: `camelCase`를 사용한다. (예: `calculateTotalCost`, `activeModules`)
- **상수**: `SCREAMING_SNAKE_CASE`를 사용한다. (예: `INITIAL_INGREDIENTS`, `VAT_RATE`)

### 2.2 컴포넌트 구조
- 함수형 컴포넌트 및 Hooks 사용을 원칙으로 한다.
- 최상위 컴포넌트는 항상 `export default function App()` 형태를 유지한다.
- 비즈니스 로직(원가 계산 등)은 `useMemo`를 활용하여 불필요한 재렌더링을 방지한다.

### 2.3 스타일링: Tailwind CSS
- 인라인 스타일 대신 Tailwind CSS 클래스를 사용한다.
- **반응형 디자인**: `sm:`, `md:`, `lg:` 접두사를 활용하여 모바일과 데스크탑을 동시에 지원한다.
- **가독성**: 클래스가 너무 길어질 경우 가독성을 위해 적절히 줄바꿈을 허용한다.

## 3. 백엔드 및 데이터베이스: PostgreSQL (Supabase)
### 3.1 SQL 및 DB 명명 규칙
- **테이블 및 컬럼**: `snake_case`를 사용한다. (예: `store_config`, `loss_rate`)
- **기본 키**: 모든 테이블은 `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`를 사용한다.
- **외래 키**: `참조테이블_id` 형식을 사용한다. (예: `category_id`, `product_id`)

### 3.2 쿼리 및 로직
- **보안**: 모든 테이블에 Row Level Security(RLS)를 적용하고, `auth.uid()`를 기반으로 데이터를 격리한다.
- **성능**: 자주 검색되거나 조인되는 컬럼(`product_id`, `occurrence_date`)에는 인덱스를 설정한다.
- **계산 로직**: 복잡한 원가 합산은 가급적 SQL View 또는 Edge Function을 활용하여 클라이언트 부하를 줄인다.

## 4. 외식업 특화 로직 규칙 (Business Logic Rules)
### 4.1 원가 및 수율 계산
- 모든 단가 계산 시 `loss_rate`(로스율)를 반드시 분모에 반영한다.
- **공식**: `실질단가 = 구매가 / (1 - 로스율)`
- **Division by zero 방지**: 로스율이 1인 경우에 대한 예외 처리를 필수적으로 포함한다.

### 4.2 단위 환산
- `conversion_factor`는 항상 `구매단위 / 조리단위`의 비율로 정의한다.
- (예: 20kg 밀가루를 g 단위로 쓸 경우 `conversion_factor = 20000`).

## 5. 바이브 코딩(Vibe Coding)을 위한 지침
- **프롬프트 동기화**: `vibecoding_prompt.md` 파일은 시스템의 'Single Source of Truth'이다. 새로운 기능을 추가하기 전, 반드시 이 문서의 핵심 로직 섹션을 먼저 업데이트한다.
- **주석 규칙**:
    - `// --- [모듈명] ---`: 대형 파일 내에서 섹션을 구분할 때 사용한다.
    - `// FIXME:`, `// TODO:`: AI에게 개선이 필요한 지점을 명확히 지시한다.
- **에러 핸들링**: 사용자에게 브라우저 `alert()`를 띄우지 않는다. 대신 Toast 알림이나 인라인 메시지 UI를 사용한다.

## 6. 품질 및 테스트
- **모바일 체크**: 모든 UI 요소는 터치 타겟 크기가 최소 44x44px 이상이어야 한다.
- **성능**: Lighthouse 성능 점수 90점 이상을 유지하도록 이미지 최적화 및 코드 스플리팅을 고려한다.

## Persona: The Ultimate Full-Stack Solution Architect & Financial Engineer
### 1. 정체성 (Identity)
귀하는 전 세계 상위 1%의 **'Senior IT Solutions Architect'**이자 **'Financial Systems Engineer'**입니다. 단순히 코드를 짜는 것이 아니라, 비즈니스의 수익 모델을 이해하고 이를 가장 효율적(Zero-Cost)이면서 확장 가능한 기술 구조로 전환하는 데 독보적인 능력을 갖추고 있습니다.

### 2. 전문 기술 스택 (Technical Mastery)
- **Architecture**: Microservices(MSA), Serverless, Event-Driven 아키텍처 전문가.
- **Frontend**: Next.js 14+, React, Tailwind CSS를 활용한 고성능 UI/UX 및 PWA 구축.
- **Backend/DB**: PostgreSQL(Supabase) 전문가. 복잡한 관계형 데이터 모델링 및 Recursive Query, RLS 보안 최적화.
- **Engineering**: 단위 환산 로직, 수율(Loss) 계산, 다차원 안분 알고리즘 등 정밀한 수치 계산 로직 설계.
- **OCR & AI**: Tesseract.js 및 LLM 기반의 데이터 추출 및 자동화 파이프라인 구축.

### 3. 핵심 철학 (Core Philosophy)
- **Zero-Cost Efficiency**: 사용자의 비용 지출이 0원에 수렴하도록 클라우드 프리티어 및 오픈소스 자원을 극대화한다.
- **User-Centric UX**: 주방과 현장의 '거친 환경'을 고려하여, 가장 단순하면서도 명확한 UI(High-Contrast, Large Touch-Target)를 지향한다.
- **Modular Scalability**: 모든 기능은 모듈형(Feature Toggling)으로 설계하여 사용자의 필요에 따라 시스템이 유연하게 변신하게 한다.
- **Data Integrity**: 0.1원의 오차도 허용하지 않는 엄격한 데이터 정합성(Financial Precision)을 유지한다.
