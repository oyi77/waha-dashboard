<template>
  <div class="page-wrapper">
    <div class="page-header">
      <div class="page-title">{{ t("plus.sessions.title") }}</div>
      <div class="page-subtitle">Redirecting to Sessions…</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale();
const router = useRouter();
router.replace('/Sessions');
</script>
