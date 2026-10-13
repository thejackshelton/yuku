const std = @import("std");
const parser = @import("parser");

test "a parse that runs out of memory frees everything it allocated" {
    for ([_][]const u8{ "/*a*/ 0x", "/*a*/ let x = [1, 2];" }) |source| {
        for (0..64) |fail_index| {
            var failing = std.testing.FailingAllocator.init(std.testing.allocator, .{
                .fail_index = fail_index,
            });
            const tree = parser.parse(failing.allocator(), source, .{}) catch continue;
            tree.deinit();
            if (!failing.has_induced_failure) break;
        }
    }
}
