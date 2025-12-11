// THIS FILE IS GENERATED, DO NOT EDIT!
/* eslint-disable eslint-comments/no-unlimited-disable */
/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import { ref, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { subscription } from './sdk'
import type { SubscriptionClient } from './subscribe'
import type * as Types from '#graphql/client'

export interface UseSubscriptionReturn<T> {
  /** Reactive subscription data */
  data: Ref<T | null>
  /** Is subscription active */
  isActive: Ref<boolean>
  /** Last error */
  error: Ref<Error | null>
  /** Start subscription */
  start: () => void
  /** Stop subscription */
  stop: () => void
}

export function useCountdown(
  variables: Types.CountdownSubscriptionVariables,
  options?: { immediate?: boolean }
): UseSubscriptionReturn<Types.CountdownSubscription['countdown']> {
  const data = ref<Types.CountdownSubscription['countdown'] | null>(null) as Ref<Types.CountdownSubscription['countdown'] | null>
  const isActive = ref(false)
  const error = ref<Error | null>(null)
  let sub: SubscriptionClient | null = null

  function start() {
    stop()
    isActive.value = true
    error.value = null
    sub = subscription.countdown(variables)
      .onData((d) => { data.value = d })
      .onError((e) => { error.value = e; isActive.value = false })
      .start()
  }

  function stop() {
    sub?.unsubscribe()
    sub = null
    isActive.value = false
  }

  if (options?.immediate) start()
  onUnmounted(stop)

  return { data, isActive, error, start, stop }
}

export function useGreetings(
  options?: { immediate?: boolean }
): UseSubscriptionReturn<Types.GreetingsSubscription['greetings']> {
  const data = ref<Types.GreetingsSubscription['greetings'] | null>(null) as Ref<Types.GreetingsSubscription['greetings'] | null>
  const isActive = ref(false)
  const error = ref<Error | null>(null)
  let sub: SubscriptionClient | null = null

  function start() {
    stop()
    isActive.value = true
    error.value = null
    sub = subscription.greetings()
      .onData((d) => { data.value = d })
      .onError((e) => { error.value = e; isActive.value = false })
      .start()
  }

  function stop() {
    sub?.unsubscribe()
    sub = null
    isActive.value = false
  }

  if (options?.immediate) start()
  onUnmounted(stop)

  return { data, isActive, error, start, stop }
}

export function useServerTime(
  options?: { immediate?: boolean }
): UseSubscriptionReturn<Types.ServerTimeSubscription['serverTime']> {
  const data = ref<Types.ServerTimeSubscription['serverTime'] | null>(null) as Ref<Types.ServerTimeSubscription['serverTime'] | null>
  const isActive = ref(false)
  const error = ref<Error | null>(null)
  let sub: SubscriptionClient | null = null

  function start() {
    stop()
    isActive.value = true
    error.value = null
    sub = subscription.serverTime()
      .onData((d) => { data.value = d })
      .onError((e) => { error.value = e; isActive.value = false })
      .start()
  }

  function stop() {
    sub?.unsubscribe()
    sub = null
    isActive.value = false
  }

  if (options?.immediate) start()
  onUnmounted(stop)

  return { data, isActive, error, start, stop }
}

