const std = @import("std");
const util = @import("util");
const gen_unicode_id = @import("gen_unicode_id.zig");

const testing = std.testing;

test "unicode_id can start and continue" {
    var id_starts, var id_continues = try gen_unicode_id.downloadAndParseProperties(
        testing.io,
        testing.allocator,
    );
    defer id_starts.deinit(testing.allocator);
    defer id_continues.deinit(testing.allocator);

    for (0..std.math.maxInt(u21)) |ch| {
        const cp: u32 = @intCast(ch);
        const starts = id_starts.contains(cp);
        testing.expectEqual(starts, util.UnicodeId.canStartId(cp)) catch |err| {
            std.debug.print("ID_Start failed for U+{X:0>4}\n", .{cp});
            return err;
        };
        const continues = id_continues.contains(cp);
        testing.expectEqual(continues, util.UnicodeId.canContinueId(cp)) catch |err| {
            std.debug.print("ID_Continue failed for U+{X:0>4}\n", .{cp});
            return err;
        };
    }
}
