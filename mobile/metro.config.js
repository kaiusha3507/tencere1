// Metro yapılandırması (Expo varsayılanı + küçük bir ekleme).
// Çekirdek kod (src/core) hem Node.js'te hem telefonda çalıştığı için içe aktarmalarda
// açık ".ts"/".tsx" uzantısı kullanır. Bu çözücü, göreli yollardaki uzantıyı kaldırıp
// Metro'nun standart çözümlemesine devreder; böylece iki ortam da aynı dosyaları kullanır.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const name = /^\.{1,2}\//.test(moduleName) ? moduleName.replace(/\.tsx?$/, '') : moduleName;
  return context.resolveRequest(context, name, platform);
};

module.exports = config;
