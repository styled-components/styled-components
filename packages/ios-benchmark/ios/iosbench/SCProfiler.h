#import <React/RCTBridgeModule.h>

// Bridges Hermes's sampling profiler to JS.
// `enable` / `disable` toggle the per-process sampler; `dumpToFile`
// flushes the in-memory sample buffer as a Chrome DevTools .cpuprofile.
// Relative paths resolve against the app's Documents directory; absolute
// paths are written verbatim. Returns the absolute path on success or
// empty string on failure.
@interface SCProfiler : NSObject <RCTBridgeModule>
@end
