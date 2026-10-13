const std = @import("std");

const Writer = std.Io.Writer;

pub fn toStdout(io: std.Io, generate: *const fn (*Writer) Writer.Error!void) !void {
    var buf: [64 * 1024]u8 = undefined;
    var stdout = std.Io.File.stdout().writer(io, &buf);
    try generate(&stdout.interface);
    try stdout.interface.flush();
}
