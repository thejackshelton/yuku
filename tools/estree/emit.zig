const std = @import("std");
const parser = @import("parser");
const decoder = @import("decoder.zig");

const Writer = std.Io.Writer;

pub fn toStdout(io: std.Io, generate: *const fn (*Writer) Writer.Error!void) !void {
    var buf: [64 * 1024]u8 = undefined;
    var stdout = std.Io.File.stdout().writer(io, &buf);
    try generate(&stdout.interface);
    try stdout.interface.flush();
}

/// Writes the decoder for `mode` to stdout, minified by Yuku itself.
pub fn decoderToStdout(io: std.Io, mode: decoder.Mode) !void {
    var arena_state = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena_state.deinit();
    const arena = arena_state.allocator();

    var generated: Writer.Allocating = .init(arena);
    try decoder.generate(&generated.writer, mode);

    var buf: [64 * 1024]u8 = undefined;
    var stdout = std.Io.File.stdout().writer(io, &buf);
    try minified(arena, &stdout.interface, generated.written());
    try stdout.interface.flush();
}

fn minified(arena: std.mem.Allocator, w: *Writer, js: []const u8) !void {
    var tree = try parser.parse(arena, js, .{});
    if (tree.hasErrors()) return error.GeneratedJsDoesNotParse;

    const result = try parser.codegen.generate(arena, &tree, .{
        .minify = true,
        .format = .compact,
        .quotes = .shortest,
        .comments = .none,
    });
    if (result.diagnostics.len != 0) return error.GeneratedJsDoesNotPrint;

    if (std.mem.startsWith(u8, js, "//")) {
        const nl = std.mem.findScalar(u8, js, '\n').?;
        try w.writeAll(js[0 .. nl + 1]);
    }
    try w.writeAll(result.code);
    if (!std.mem.endsWith(u8, result.code, "\n")) try w.writeAll("\n");
}
