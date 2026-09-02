const std = @import("std");
const parser = @import("parser");

fn expectTwoStatementsWithJSXLast(source: []const u8) !void {
    std.debug.assert(source.len > 0);
    std.debug.assert(std.mem.indexOfScalar(u8, source, '\n') != null);

    var tree = try parser.parse(std.testing.allocator, source, .{ .lang = .tsx });
    defer tree.deinit();
    try std.testing.expect(!tree.hasErrors());

    const program = tree.data(tree.root).program;
    const body = tree.extra(program.body);
    try std.testing.expectEqual(@as(usize, 2), body.len);
    try std.testing.expectEqual(.variable_declaration, std.meta.activeTag(tree.data(body[0])));
    const statement = tree.data(body[1]).expression_statement;
    try std.testing.expectEqual(.jsx_element, std.meta.activeTag(tree.data(statement.expression)));
}

const ContinuationShape = enum {
    expression_less_than,
    generic_call,
    declaration_addition,
};

fn expectOneStatement(source: []const u8, shape: ContinuationShape) !void {
    std.debug.assert(source.len > 0);
    std.debug.assert(std.mem.indexOfScalar(u8, source, '<') != null);

    var tree = try parser.parse(std.testing.allocator, source, .{ .lang = .tsx });
    defer tree.deinit();
    try std.testing.expect(!tree.hasErrors());

    const program = tree.data(tree.root).program;
    const body = tree.extra(program.body);
    try std.testing.expectEqual(@as(usize, 1), body.len);

    switch (shape) {
        .expression_less_than => {
            const expression = tree.data(body[0]).expression_statement.expression;
            const binary = tree.data(expression).binary_expression;
            try std.testing.expectEqual(parser.ast.BinaryOperator.less_than, binary.operator);
        },
        .generic_call => {
            const expression = tree.data(body[0]).expression_statement.expression;
            const assignment = tree.data(expression).assignment_expression;
            const call = tree.data(assignment.right).call_expression;
            try std.testing.expect(call.type_arguments != .null);
        },
        .declaration_addition => {
            const declaration = tree.data(body[0]).variable_declaration;
            const declarators = tree.extra(declaration.declarators);
            try std.testing.expectEqual(@as(usize, 1), declarators.len);
            const init = tree.data(declarators[0]).variable_declarator.init;
            const less_than = tree.data(init).binary_expression;
            try std.testing.expectEqual(parser.ast.BinaryOperator.less_than, less_than.operator);
            const addition = tree.data(less_than.right).binary_expression;
            try std.testing.expectEqual(parser.ast.BinaryOperator.add, addition.operator);
        },
    }
}

test "line-leading committed JSX ends the previous statement" {
    // Each source has an expression-ending token before line-leading JSX.
    const cases = [_][]const u8{
        "const count = get()\n\n<button>{'Count: ' + count}</button>",
        "const wide = a < b\n<main>{wide}</main>",
        "const useValue =\n<T extends Value,>(value: T): T => value\n" ++
            "<main>{useValue(1)}</main>",
    };
    for (cases) |source| try expectTwoStatementsWithJSXLast(source);
}

test "less-than expression continuations stay expressions" {
    // Line position, tag commitment, and same-line generic calls guard ASI.
    const Case = struct {
        source: []const u8,
        shape: ContinuationShape,
    };
    const cases = [_]Case{
        .{ .source = "a <\nb", .shape = .expression_less_than },
        .{ .source = "a\n< b", .shape = .expression_less_than },
        .{ .source = "x = y <T>(z)", .shape = .generic_call },
        .{ .source = "const wide = a < b\n  + c", .shape = .declaration_addition },
    };
    for (cases) |case| try expectOneStatement(case.source, case.shape);
}
