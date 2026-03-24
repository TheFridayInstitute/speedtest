<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { SelectIcon, SelectTrigger, type SelectTriggerProps, useForwardProps } from 'reka-ui'
import { ChevronDown } from 'lucide-vue-next'
import { cn } from '@src/@/utils'

const props = defineProps<SelectTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectTrigger
    v-bind="forwardedProps"
    :class="cn(
      'flex h-10 w-full items-center justify-between rounded-full border border-border/40 bg-card/50 backdrop-blur-sm px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--ring)/0.3),0_0_8px_hsl(var(--ring)/0.15)] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate text-start transition-all duration-150',
      props.class,
    )"
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="w-4 h-4 opacity-50 shrink-0" />
    </SelectIcon>
  </SelectTrigger>
</template>
