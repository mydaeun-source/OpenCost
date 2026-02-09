# Open-Cost Master 배포 가이드 (Deployment Guide)

이 문서는 **Open-Cost Master**를 실제 서비스 가능한 환경에 무료로 배포하는 방법을 설명합니다.
우리는 **Vercel** (프론트엔드 호스팅)과 **Supabase** (데이터베이스) 조합을 사용하여 '평생 무료'로 운영할 수 있습니다.

---

## 1. Supabase (백엔드) 설정

이미 개발 과정에서 Supabase 프로젝트를 생성하셨을 것입니다. 배포를 위해 다음을 확인하세요.

### 1-1. Production URL 설정 (선택 사항)
1. Supabase 대시보드 로그인.
2. `Authentication` -> `URL Configuration` 이동.
3. **Site URL**에 추후 생성될 Vercel 도메인(예: `https://open-cost-master.vercel.app`)을 입력해야 로그인이 정상 작동합니다. (배포 후 설정)

---

## 2. Vercel (프론트엔드) 배포

가장 쉽고 빠른 Next.js 배포 방법입니다.

### 2-1. GitHub에 코드 푸시
1. 현재 프로젝트를 본인의 GitHub 저장소(Repository)에 업로드합니다.
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   # 본인의 레포지토리 주소로 변경
   git remote add origin https://github.com/Start-Up-Korea/open-cost-master.git
   git push -u origin main
   ```

### 2-2. Vercel 프로젝트 생성
1. [Vercel](https://vercel.com)에 접속하여 회원가입/로그인합니다.
2. **"Add New..."** -> **"Project"** 클릭.
3. 방금 올린 GitHub 저장소를 **Import** 합니다.

### 2-3. 환경 변수 설정 (중요!)
Vercel 배포 화면의 **Environment Variables** 섹션에 `.env.local` 파일의 내용을 그대로 복사해 넣습니다.

| Key | Value | 설명 |
|-----|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI...` | Supabase 공개(Anon) 키 |

### 2-4. 배포 시작
1. **Deploy** 버튼을 클릭합니다.
2. 약 1~2분 후 배포가 완료되면 폭죽이 터집니다! 🎉
3. 생성된 도메인(URL)을 클릭하여 접속해봅니다.

---

## 3. 로컬 테스트 (Local Testing)

배포 전에 내 컴퓨터에서 직접 실행해보고 싶다면 아래 명령어를 사용하세요.

```bash
# 의존성 패키지 설치 (최초 1회)
npm install

# 개발 서버 실행
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하면 바로 테스트 가능합니다.

---

## 4. 문제 해결 (Troubleshooting)

**Q. 로그인이 안 돼요!**
A. Supabase의 `Authentication` -> `URL Configuration` -> `Redirect URLs`에 Vercel 도메인이 등록되어 있는지 확인하세요.

**Q. 데이터가 안 보여요!**
A. RLS(Row Level Security) 정책 때문에 로그인하지 않으면 데이터를 볼 수 없도록 설정되어 있을 수 있습니다. 우측 상단이나 로그인 페이지를 통해 먼저 로그인해주세요.
