/** IP address metadata from the lookup endpoint. */
export interface IPInfo {
    org: string;
    city?: string;
    region?: string;
    country?: string;
    [key: string]: unknown;
}

/** Entity lookup result from IP resolution. */
export interface LookedUpIP {
    row?: {
        "Entity Name": string;
        "Entity ID": string;
        [key: string]: unknown;
    };
}
