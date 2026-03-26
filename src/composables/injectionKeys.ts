import type { InjectionKey } from "vue";
import type { UseSpeedtestReturn } from "./useSpeedtest";
import type { useAPI } from "./useAPI";
import type { useIPInfo } from "./useIPInfo";
import type { useGeolocation } from "./useGeolocation";
import type { useServerManager } from "./useServerManager";

export const SpeedtestKey: InjectionKey<UseSpeedtestReturn> = Symbol("speedtest");
export const APIKey: InjectionKey<ReturnType<typeof useAPI>> = Symbol("api");
export const IPInfoKey: InjectionKey<ReturnType<typeof useIPInfo>> = Symbol("ipInfoProvider");
export const GeolocationKey: InjectionKey<ReturnType<typeof useGeolocation>> = Symbol("geolocation");
export const ServerManagerKey: InjectionKey<ReturnType<typeof useServerManager>> = Symbol("serverManager");
