// ── Consumer-facing generics ────────────────────────────────────────

/**
 * Type for a JSON object.
 */
export type JsonObject = Record<string, any>;

/**
 * Type for an API function that takes input and returns output.
 * @template I The type of the input object.
 * @template O The type of the output object.
 */
export type ApiFn<I extends JsonObject, O extends JsonObject> =
    (input: I) => Promise<O>;

/**
 * Type for a map of API functions.
 */
export type ApiMap = Record<string, ApiFn<any, any>>;

/**
 * Type for an API client that proxies API calls to the sandbox.
 * @template T The type of the API map.
 */
export type ApiClient<T extends ApiMap> = {
    [K in keyof T]: (input: Parameters<T[K]>[0]) => Promise<Awaited<ReturnType<T[K]>>>;
};

/**
 * Pairs an API type with a config type. Both are phantom — only config is used at runtime.
 * @template TApi The API map type for this app.
 * @template TConfig The config object type passed during initialization.
 */
export interface AppDef<TApi extends ApiMap, TConfig extends JsonObject> {
    readonly __apiType?: TApi;
    readonly __configType?: TConfig;
}

/**
 * Constraint for a map of app definitions.
 * Each key is an app name; each value is an {@link AppDef} pairing an API type with a config type.
 */
export type AppDefMap = Record<string, AppDef<ApiMap, JsonObject>>;

/**
 * Extracts the config objects from an {@link AppDefMap}.
 * This is what consumers pass as the argument to {@link initializeShadowWeb}.
 * @template T The app definition map.
 */
export type AppConfigs<T extends AppDefMap> = {
    [K in keyof T]: T[K] extends AppDef<any, infer C> ? C : never;
};

/**
 * Extracts typed {@link ApiClient} instances from an {@link AppDefMap}.
 * This is what consumers receive back from {@link initializeShadowWeb}.
 * @template T The app definition map.
 */
export type MultiAppResult<T extends AppDefMap> = {
    [K in keyof T]: ApiClient<T[K] extends AppDef<infer A, any> ? A : never>;
};

// ── Sandbox message protocol ────────────────────────────────────────

/**
 * Represents a command to be executed within a sandbox environment.
 *
 * This interface defines the structure for commands that are sent to a sandboxed
 * application or service. The command specifies the asynchronous operation ID,
 * the target application name, the API name to invoke, and an optional payload
 * containing additional data necessary for the operation.
 *
 * @property asyncId - A unique identifier associated with the asynchronous operation.
 * @property appName - The name of the target application where the command should be executed.
 * @property apiName - The name of the API method to invoke in the target application.
 * @property payload - An optional JSON object containing additional data required
 *                                    for the command execution.
 */
interface SandboxCommand {
    asyncId: string;
    appName: string;
    apiName: string;
    payload?: JsonObject;
}

/**
 * Represents the response structure returned by a sandbox operation.
 *
 * @interface SandboxResponse
 * @property asyncId - A unique identifier for the asynchronous operation.
 * @property success - Indicates whether the operation was successful.
 * @property data - The data returned from the operation, if successful.
 * @property error - Describes the error in case the operation was not successful.
 */
interface SandboxResponse {
    asyncId: string;
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * Type for a map of loaded applications.
 */
interface SessionApps { [appName: string]: LoadedApp; }
/**
 * Describes a single app returned from the backend init response.
 * @property functions The list of API function names available on this app.
 */
interface LoadedApp { functions: string[]; }

// ── Internal state ──────────────────────────────────────────────────

/**
 * State object for managing the Shadow Web sandbox iframe.
 * @property sandbox The iframe element representing the Shadow Web sandbox.
 * @property pendingCommands A map of pending command responses keyed by asyncId.
 */
interface ShadowWebState {
    sandbox: HTMLIFrameElement;
    pendingCommands: Map<string, Deferred<any>>;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * A deferred promise that can be resolved or rejected.
 */
class Deferred<T> {
    public promise: Promise<T>;
    public resolve!: (value: T | PromiseLike<T>) => void;
    public reject!: (reason?: any) => void;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

// ── Core API ────────────────────────────────────────────────────────

// noinspection JSUnusedGlobalSymbols
/**
 * Creates a sandbox iframe, initializes the session against Track Shadow,
 * and returns typed API proxies for one or more apps.
 * @param apps A map of app names to their config objects.
 * @returns A promise that resolves to a map of API client objects.
 */
export async function initializeShadowWeb<T extends AppDefMap>(
    apps: AppConfigs<T>
): Promise<MultiAppResult<T>> {
    console.log("Initializing Shadow Web...");

    const state = instantiateState();

    // Listen for all sandbox responses
    window.addEventListener("message", (event) => handleCommandResponse(event, state));

    // Append hidden iframe
    document.body.appendChild(state.sandbox);

    // Wait for iframe to load
    await new Promise<void>(resolve => {
        state.sandbox.onload = () => resolve();
    });

    // Build the init payload from the apps config map
    const appsPayload: Record<string, object> = {};
    for (const appName of Object.keys(apps)) {
        appsPayload[appName] = (apps as Record<string, object>)[appName];
    }

    // Send _core/init to establish session and discover APIs
    const sessionApps = await sendCommand<SessionApps>(state, {
        asyncId: crypto.randomUUID(),
        appName: "_core",
        apiName: "init",
        payload: { apps: appsPayload }
    });

    // Build a proxy per app from the response
    const result: Record<string, Record<string, (input: object) => Promise<object>>> = {};
    for (const appName of Object.keys(apps)) {
        const loadedApp = sessionApps[appName];
        if (!loadedApp || !loadedApp.functions) {
            throw new Error(`App "${appName}" not found in init response`);
        }
        result[appName] = buildApiProxy(state, appName, loadedApp.functions);
    }

    registerCleanup(state);

    return result as MultiAppResult<T>;
}

/**
 * Creates a new ShadowWebState object with a sandbox iframe for the specified applications.
 * @returns A new ShadowWebState object.
 */
function instantiateState(): ShadowWebState {
    const sandbox = document.createElement('iframe');
    sandbox.src = "https://emc2summary/GetSummaryReport.ashx/track/XSHADOW/NR%20Shadow%20Web/sandbox";
    sandbox.style.display = 'none';

    return {
        sandbox,
        pendingCommands: new Map()
    };
}

/**
 * Registers a best-effort cleanup handler on page unload.
 */
function registerCleanup(state: ShadowWebState): void {
    window.addEventListener("beforeunload", () => {
        sendCommand(state, {
            asyncId: crypto.randomUUID(),
            appName: "_core",
            apiName: "close"
        }).catch(() => { /* fire-and-forget */ });
    });
}

// ── Message handling ────────────────────────────────────────────────

/**
 * Handles a command response from the sandbox.
 * @param event The message event containing the response.
 * @param state The state object containing the sandbox iframe.
 */
function handleCommandResponse(event: MessageEvent, state: ShadowWebState) {
    const response = event.data as SandboxResponse;
    if (!response || !response.asyncId) {
        return;
    }

    const deferred = state.pendingCommands.get(response.asyncId);
    if (!deferred) {
        console.warn("Received response for unknown asyncId:", response.asyncId);
        return;
    }

    state.pendingCommands.delete(response.asyncId);

    if (response.success) {
        deferred.resolve(response.data);
    } else {
        deferred.reject(new Error(response.error || "Unknown error"));
    }
}

/**
 * Sends a command to the sandbox and waits for a response.
 * @param state The state object containing the sandbox iframe.
 * @param command The command to send.
 * @param timeout The timeout in milliseconds. Defaults to 30 seconds.
 */
async function sendCommand<T>(state: ShadowWebState, command: SandboxCommand, timeout: number = 30_000): Promise<T> {
    const deferred = new Deferred<T>();

    const timer = setTimeout(() => {
        state.pendingCommands.delete(command.asyncId);
        deferred.reject(new Error(`Command ${command.appName}/${command.apiName} timed out after ${timeout}ms`));
    }, timeout);

    state.pendingCommands.set(command.asyncId, deferred);
    state.sandbox.contentWindow?.postMessage(command, '*');

    try {
        return await deferred.promise;
    } catch (err) {
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

// ── Proxy builder ───────────────────────────────────────────────────

/**
 * Builds a proxy object for the specified API functions.
 * @param state The state object containing the sandbox iframe.
 * @param appName The name of the application this proxy targets.
 * @param functionNames The names of the API functions to proxy.
 * @returns A proxy object with the specified API functions.
 */
function buildApiProxy(state: ShadowWebState, appName: string, functionNames: string[]): Record<string, (input: object) => Promise<object>> {
    const api: Record<string, (input: object) => Promise<object>> = {};

    for (const fnName of functionNames) {
        api[fnName] = async (input: object): Promise<object> => {
            return await sendCommand<object>(state, {
                asyncId: crypto.randomUUID(),
                appName,
                apiName: fnName,
                payload: input as JsonObject
            });
        };
    }

    return api;
}
