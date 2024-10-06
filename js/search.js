function search() {
    var input = $("#search-input").val().toLowerCase();

    var results = searchData.filter(function (e) {
        return e.title.includes(input) || e.categories.includes(input);
    }).map(function (e) {
        return e.url;
    });

    $(".blog-post").each(function () {
        $(this).toggle(results.includes($(this).data('url')));
    });
}

$("#search-input").on('input', search);
