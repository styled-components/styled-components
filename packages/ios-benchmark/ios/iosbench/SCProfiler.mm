#import "SCProfiler.h"

#import <hermes/hermes.h>

#import <string>

using IHermesRootAPI = facebook::hermes::IHermesRootAPI;

// Hermes's sampling profiler is a process-global singleton accessed via
// `makeHermesRootAPI()->castInterface<IHermesRootAPI>()`. It has static
// lifetime and does NOT require a `jsi::Runtime` to operate, so we do not
// need to reach through the RN bridge to find one.
static IHermesRootAPI *rootAPI() {
  static IHermesRootAPI *cached = nullptr;
  if (cached == nullptr) {
    cached = facebook::jsi::castInterface<IHermesRootAPI>(facebook::hermes::makeHermesRootAPI());
  }
  return cached;
}

@implementation SCProfiler

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(enable) {
  IHermesRootAPI *api = rootAPI();
  if (!api) return @NO;
  api->enableSamplingProfiler();
  return @YES;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(disable) {
  IHermesRootAPI *api = rootAPI();
  if (!api) return @NO;
  api->disableSamplingProfiler();
  return @YES;
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(dumpToFile : (NSString *)path) {
  IHermesRootAPI *api = rootAPI();
  if (!api) return @"";
  NSString *resolved = path;
  if (![path isAbsolutePath]) {
    NSString *docs = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject;
    resolved = [docs stringByAppendingPathComponent:path];
  }
  std::string fileName([resolved UTF8String]);
  api->dumpSampledTraceToFile(fileName);
  return resolved ?: @"";
}

@end
