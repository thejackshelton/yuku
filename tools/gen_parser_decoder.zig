// generates the yuku-parser decode.js
// one root file per generated artifact keeps the generators free of argument parsing

const std = @import("std");
const emit = @import("estree/emit.zig");

pub fn main(init: std.process.Init) !void {
    try emit.decoderToStdout(init.io, .parser);
}
