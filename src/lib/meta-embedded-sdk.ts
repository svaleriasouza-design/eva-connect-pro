type MetaSDK = {
  init: (options: Record<string, unknown>) => void;
  login: (callback: (result: { authResponse?: { code?: string } }) => void, options: Record<string, unknown>) => void;
};
type MetaWindow = Window & { FB?: MetaSDK; fbAsyncInit?: () => void };
let loading: Promise<MetaSDK> | null = null;

export function loadMetaSDK(appId: string, version: string) {
  const win = window as MetaWindow;
  if (loading) return loading;
  loading = new Promise<MetaSDK>((resolve, reject) => {
    const timer = window.setTimeout(() => { loading = null; reject(new Error("A janela Meta não carregou. Verifique bloqueadores e tente novamente.")); }, 20000);
    const initialize = () => {
      if (!win.FB) return;
      win.FB.init({ appId, version, autoLogAppEvents: false, xfbml: false });
      window.clearTimeout(timer);
      resolve(win.FB);
    };
    if (win.FB) { initialize(); return; }
    win.fbAsyncInit = initialize;
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/pt_BR/sdk.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => { window.clearTimeout(timer); loading = null; script.remove(); reject(new Error("Não foi possível carregar a conexão Meta.")); };
    document.head.appendChild(script);
  });
  return loading;
}