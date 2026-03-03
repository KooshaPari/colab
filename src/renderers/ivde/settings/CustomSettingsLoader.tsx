import { type Component, Show, createSignal, onCleanup, onMount } from "solid-js";
import { electrobun } from "../init";
import { getSettingsComponent } from "../slates/pluginSlateRegistry";

export interface CustomSettingsComponentProps {
  pluginName: string;
  sendMessage: (message: unknown) => Promise<void>;
  onMessage: (callback: (message: unknown) => void) => void;
  getState: <T = unknown>(key: string) => Promise<T | undefined>;
  setState: <T = unknown>(key: string, value: T) => Promise<void>;
}

async function loadCustomComponent(
  name: string,
): Promise<Component<CustomSettingsComponentProps> | null> {
  const component = getSettingsComponent(name);
  if (!component) {
    console.warn(`Unknown custom settings component: ${name}`);
    return null;
  }
  return component as Component<CustomSettingsComponentProps>;
}

export const CustomSettingsLoader = (props: {
  componentName: string;
  pluginName: string;
}) => {
  const [CustomComponent, setCustomComponent] =
    createSignal<Component<CustomSettingsComponentProps> | null>(null);
  const [loadError, setLoadError] = createSignal<string | null>(null);
  const [loadingComponent, setLoadingComponent] = createSignal(true);

  onMount(async () => {
    try {
      const component = await loadCustomComponent(props.componentName);
      if (component) {
        setCustomComponent(() => component);
      } else {
        setLoadError(`Component "${props.componentName}" not found`);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load component");
    } finally {
      setLoadingComponent(false);
    }
  });

  const sendMessage = async (message: unknown) => {
    await electrobun.rpc?.request.pluginSendSettingsMessage({
      pluginName: props.pluginName,
      message,
    });
  };

  const messageListeners: ((message: unknown) => void)[] = [];
  const onMessage = (callback: (message: unknown) => void) => {
    messageListeners.push(callback);
  };

  let pollInterval: ReturnType<typeof setInterval> | null = null;
  onMount(() => {
    const pollMessages = async () => {
      try {
        const messages = await electrobun.rpc?.request.pluginGetPendingSettingsMessages({
          pluginName: props.pluginName,
        });
        if (!messages?.length) {
          return;
        }
        for (const msg of messages) {
          for (const listener of messageListeners) {
            listener(msg);
          }
        }
      } catch (e) {
        console.error("Failed to poll messages:", e);
      }
    };

    pollInterval = setInterval(pollMessages, 200);
  });

  onCleanup(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });

  const getStateValue = async <T = unknown,>(key: string): Promise<T | undefined> => {
    return (await electrobun.rpc?.request.pluginGetStateValue({
      pluginName: props.pluginName,
      key,
    })) as T | undefined;
  };

  const setStateValue = async <T = unknown,>(key: string, value: T): Promise<void> => {
    await electrobun.rpc?.request.pluginSetStateValue({
      pluginName: props.pluginName,
      key,
      value,
    });
  };

  return (
    <div style="margin-top: 16px; border-top: 1px solid #333; padding-top: 16px;">
      <Show when={loadingComponent()}>
        <div style="padding: 16px; text-align: center; color: #888; font-size: 12px;">
          Loading...
        </div>
      </Show>
      <Show when={loadError()}>
        <div style="padding: 16px; color: #ff6b6b; font-size: 12px;">
          Failed to load settings component: {loadError()}
        </div>
      </Show>
      <Show when={!loadingComponent() && !loadError() && CustomComponent()}>
        {(() => {
          const Comp = CustomComponent()!;
          return (
            <Comp
              pluginName={props.pluginName}
              sendMessage={sendMessage}
              onMessage={onMessage}
              getState={getStateValue}
              setState={setStateValue}
            />
          );
        })()}
      </Show>
    </div>
  );
};
