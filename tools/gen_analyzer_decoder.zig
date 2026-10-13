// generates the yuku-analyzer decode.js

const std = @import("std");
const emit = @import("estree/emit.zig");

pub fn main(init: std.process.Init) !void {
    try emit.decoderToStdout(init.io, .analyzer);
}
