const std = @import("std");
const decoder = @import("estree/decoder.zig");
const emit = @import("estree/emit.zig");

pub fn main(init: std.process.Init) !void {
    try emit.toStdout(init.io, decoder.generateWalkTables);
}
