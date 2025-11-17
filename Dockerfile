# ============================================
# 빌드 스테이지
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 파일 복사 (캐시 최적화)
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# 패키지 매니저에 따라 의존성 설치
# pnpm 우선, 없으면 npm 사용
RUN if [ -f "pnpm-lock.yaml" ]; then \
      corepack enable && corepack prepare pnpm@latest --activate && \
      pnpm install --frozen-lockfile; \
    else \
      npm ci; \
    fi

# 소스 코드 복사
COPY . .

# Next.js 빌드 (standalone 출력 모드 사용)
RUN npm run build

# ============================================
# 프로덕션 스테이지
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# 보안을 위해 non-root 사용자 생성
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone 출력 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# nextjs 사용자로 전환
USER nextjs

# 포트 노출 (Next.js 기본 포트)
EXPOSE 3000

# 환경 변수 설정
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Next.js 서버 시작
CMD ["node", "server.js"]

