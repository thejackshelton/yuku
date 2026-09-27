const std = @import("std");
const parser = @import("parser");
const extension = @import("extension");

const ast = parser.ast;
const Hook = extension.Hook;

const Case = struct { source: []const u8, lang: ast.Lang = .js };

/// between them these reach all 20 extension points; none of them is a parse error.
const corpus = [_]Case{
    .{ .source =
    \\let x = 1;
    \\const [a, { b }] = arr;
    \\function f(p) { return p; }
    \\class C { m() { return 2; } }
    \\for (const i of items) f(i);
    },
    .{ .source = "@dec class C {}\nconst c = (@dec class {});", .lang = .ts },
    .{ .source = "for (const i of items @tail) f(i);" },
    .{ .source = "import x from bare;" },
    .{ .source = "const el = <div a={1}>hi{ok}</div>;\nconst frag = <><b>bold</b></>;", .lang = .jsx },
    .{ .source = "const el = <p>!!shout</p>;", .lang = .jsx },
    .{ .source = "const el = <div>x</_>;\nconst d = <Deprecated />;", .lang = .jsx },
};

fn parseCase(case: Case) !ast.Tree {
    return parser.parse(std.testing.allocator, case.source, .{ .lang = case.lang });
}

fn firstNode(tree: *const ast.Tree, tag: std.meta.Tag(ast.NodeData)) !ast.NodeIndex {
    for (0..tree.nodes.len) |i| {
        const index: ast.NodeIndex = @enumFromInt(i);
        if (std.meta.activeTag(tree.data(index)) == tag) return index;
    }
    return error.NodeNotFound;
}

fn countNodes(tree: *const ast.Tree, tag: std.meta.Tag(ast.NodeData)) usize {
    var found: usize = 0;
    for (0..tree.nodes.len) |i| {
        if (std.meta.activeTag(tree.data(@enumFromInt(i))) == tag) found += 1;
    }
    return found;
}

test "every extension point is reached through the public parse API" {
    for (corpus) |case| {
        var tree = try parseCase(case);
        defer tree.deinit();
        try std.testing.expect(!tree.hasErrors());
    }

    inline for (@typeInfo(Hook).@"enum".fields) |field| {
        if (extension.counts[field.value] == 0) {
            std.debug.print("extension point never reached: {s}\n", .{field.name});
            return error.ExtensionPointUnreached;
        }
    }
}

test "declined positions keep the parser's own nodes" {
    var tree = try parseCase(corpus[0]);
    defer tree.deinit();

    try std.testing.expectEqual(@as(usize, 3), countNodes(&tree, .variable_declaration));
    try std.testing.expectEqual(@as(usize, 1), countNodes(&tree, .array_pattern));
    try std.testing.expectEqual(@as(usize, 1), countNodes(&tree, .for_of_statement));
    try std.testing.expectEqual(@as(usize, 2), countNodes(&tree, .function_body));

    var jsx = try parseCase(corpus[4]);
    defer jsx.deinit();
    try std.testing.expectEqualStrings("hi", jsx.string(jsx.data(try firstNode(&jsx, .jsx_text)).jsx_text.value));
}

test "handled positions carry the extension's own values" {
    var shout = try parseCase(corpus[5]);
    defer shout.deinit();
    try std.testing.expectEqualStrings("shout", shout.string(shout.data(try firstNode(&shout, .jsx_text)).jsx_text.value));

    var bare = try parseCase(corpus[3]);
    defer bare.deinit();
    const specifier = bare.data(try firstNode(&bare, .string_literal)).string_literal;
    try std.testing.expectEqualStrings("bare", bare.string(specifier.value));

    // `%` in prefix position: reported, then returned as handled-and-failed.
    var failed = try parser.parse(std.testing.allocator, "const bad = %;", .{});
    defer failed.deinit();
    try std.testing.expect(failed.hasErrors());
}

test "hooked cover pattern keeps its parameter annotation" {
    const source = "const f = (&{ a }: Result<T> | A): string => a;";
    var tree = try parser.parse(std.testing.allocator, source, .{ .lang = .ts });
    defer tree.deinit();
    try std.testing.expect(!tree.hasErrors());

    const arrow = tree.data(try firstNode(&tree, .arrow_function_expression))
        .arrow_function_expression;
    const parameters = tree.data(arrow.params).formal_parameters;
    const items = tree.extra(parameters.items);
    try std.testing.expectEqual(@as(usize, 1), items.len);
    const pattern = tree.data(tree.data(items[0]).formal_parameter.pattern).object_pattern;
    try std.testing.expect(pattern.type_annotation != .null);
    const annotation = tree.data(pattern.type_annotation).ts_type_annotation.type_annotation;
    try std.testing.expectEqual(.ts_union_type, std.meta.activeTag(tree.data(annotation)));
    try std.testing.expect(arrow.return_type != .null);
}

test "hooked cover pattern permits an arrow return annotation" {
    const source = "const g = (&{ a }): R => a;";
    var tree = try parser.parse(std.testing.allocator, source, .{ .lang = .ts });
    defer tree.deinit();
    try std.testing.expect(!tree.hasErrors());

    const arrow = tree.data(try firstNode(&tree, .arrow_function_expression))
        .arrow_function_expression;
    const parameters = tree.data(arrow.params).formal_parameters;
    const items = tree.extra(parameters.items);
    try std.testing.expectEqual(@as(usize, 1), items.len);
    const pattern = tree.data(tree.data(items[0]).formal_parameter.pattern).object_pattern;
    try std.testing.expectEqual(ast.NodeIndex.null, pattern.type_annotation);
    try std.testing.expect(arrow.return_type != .null);
}

test "hooked binding prefix stays binary after a left expression" {
    var tree = try parser.parse(
        std.testing.allocator,
        "const result = source&{ value: 1 };",
        .{ .lang = .ts },
    );
    defer tree.deinit();
    try std.testing.expect(!tree.hasErrors());

    const binary = tree.data(try firstNode(&tree, .binary_expression)).binary_expression;
    try std.testing.expectEqual(ast.BinaryOperator.bitwise_and, binary.operator);
    try std.testing.expectEqual(.identifier_reference, std.meta.activeTag(tree.data(binary.left)));
    try std.testing.expectEqual(.object_expression, std.meta.activeTag(tree.data(binary.right)));
}

test "ordinary parenthesized expressions leave a ternary colon to the caller" {
    var tree = try parser.parse(
        std.testing.allocator,
        "const result = condition ? ({ value: 1 }) : fallback;",
        .{ .lang = .ts },
    );
    defer tree.deinit();
    try std.testing.expect(!tree.hasErrors());

    const conditional = tree.data(try firstNode(&tree, .conditional_expression));
    try std.testing.expectEqual(.conditional_expression, std.meta.activeTag(conditional));
}
