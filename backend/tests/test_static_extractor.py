from pathlib import Path
from backend.app.ingestion.static_extractor import GenericStaticExtractor

FIXTURES_DIR = Path(__file__).parent / "fixtures"

def test_static_reader_fixture():
    html_content = (FIXTURES_DIR / "static_reader.html").read_text(encoding="utf-8")
    extractor = GenericStaticExtractor()
    result = extractor.parse_html(html_content, "https://scan.test/solo-leveling/100")

    assert result.chapter_number == "100"
    assert "Solo Leveling" in (result.title or "")
    # Should exclude logo, banner, and badge, keeping only the 5 pages
    assert len(result.page_image_urls) == 5
    assert result.page_image_urls[0] == "https://cdn.manga.test/ch100/01.jpg"
    assert result.page_image_urls[4] == "https://cdn.manga.test/ch100/05.jpg"
    assert result.layer_name == "layer_1_static"
    assert result.confidence >= 0.8

def test_lazy_reader_fixture():
    html_content = (FIXTURES_DIR / "lazy_reader.html").read_text(encoding="utf-8")
    extractor = GenericStaticExtractor()
    result = extractor.parse_html(html_content, "https://reader.test/op/1111")

    assert len(result.page_image_urls) == 4
    assert result.page_image_urls[0] == "https://img.host.test/op/1111/p001.webp"
    assert result.page_image_urls[3] == "https://img.host.test/op/1111/p004.webp"
    assert result.chapter_number == "1111"

def test_webtoon_reader_fixture():
    html_content = (FIXTURES_DIR / "webtoon_reader.html").read_text(encoding="utf-8")
    extractor = GenericStaticExtractor()
    result = extractor.parse_html(html_content, "https://webtoon.test/tog/55")

    assert len(result.page_image_urls) == 6
    assert result.page_image_urls[0] == "https://webtoon.test/tog/ep55/strip_01.png"
    assert result.page_image_urls[5] == "https://webtoon.test/tog/ep55/strip_06.png"

def test_script_reader_fixture():
    html_content = (FIXTURES_DIR / "script_reader.html").read_text(encoding="utf-8")
    extractor = GenericStaticExtractor()
    result = extractor.parse_html(html_content, "https://scan.test/jjk/250")

    assert len(result.page_image_urls) == 4
    assert result.page_image_urls[0] == "https://cdn.scan.test/jjk/ch250/001.jpg"
    assert result.page_image_urls[3] == "https://cdn.scan.test/jjk/ch250/004.jpg"
    assert result.chapter_number == "250"
