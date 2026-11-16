"""Сборка отчёта отдела в формате .docx."""
from datetime import datetime
from io import BytesIO

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

from src.schemas.reports import DepartmentReportData, ReportTaskRow
from src.schemas.tasks import BISHKEK_TZ

ROLE_LABELS = {
    "HEAD": "Начальник отдела",
    "DEPUTY": "Заместитель начальника отдела",
    "USER": "Сотрудник",
    "MANAGEMENT_HEAD": "Начальник управления",
    "DIVISION_HEAD": "Руководитель подразделения",
}
ROLE_ORDER = {"HEAD": 0, "DEPUTY": 1, "USER": 2}


def _fmt_date(value: datetime | None, with_time: bool = False) -> str:
    if value is None:
        return "—"
    local = value.astimezone(BISHKEK_TZ)
    return local.strftime("%d.%m.%Y %H:%M" if with_time else "%d.%m.%Y")


def _plural_tasks(count: int) -> str:
    mod10, mod100 = count % 10, count % 100
    if mod10 == 1 and mod100 != 11:
        return f"{count} задача"
    if 2 <= mod10 <= 4 and not 12 <= mod100 <= 14:
        return f"{count} задачи"
    return f"{count} задач"


def _is_late(task: ReportTaskRow) -> bool:
    return task.deadlines is not None and task.done_at > task.deadlines


def _shade(cell, color: str = "E7E6E6") -> None:
    properties = cell._tc.get_or_add_tcPr()
    shading = OxmlElement("w:shd")
    shading.set(qn("w:val"), "clear")
    shading.set(qn("w:color"), "auto")
    shading.set(qn("w:fill"), color)
    properties.append(shading)


def _table(document, headers: list[str], widths: list[float]):
    table = document.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for cell, header, width in zip(table.rows[0].cells, headers, widths):
        cell.width = Cm(width)
        cell.text = ""
        run = cell.paragraphs[0].add_run(header)
        run.bold = True
        _shade(cell)
    # шапка повторяется на каждой странице
    header_props = table.rows[0]._tr.get_or_add_trPr()
    repeat = OxmlElement("w:tblHeader")
    repeat.set(qn("w:val"), "true")
    header_props.append(repeat)
    return table


def _add_row(table, values: list[str], widths: list[float]) -> None:
    cells = table.add_row().cells
    for cell, value, width in zip(cells, values, widths):
        cell.width = Cm(width)
        cell.text = value


def build_department_report(data: DepartmentReportData) -> bytes:
    document = Document()
    section = document.sections[0]
    section.left_margin = section.right_margin = Cm(2)
    section.top_margin = section.bottom_margin = Cm(1.5)

    normal = document.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(12)
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    for style_name in ("Title", "Heading 1", "Heading 2"):
        style = document.styles[style_name]
        style.font.name = "Times New Roman"
        style.element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
        style.element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")

    title = document.add_heading("Отчёт о выполненных задачах", level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    info = [
        ("Отдел", data.department_title),
        ("Управление", data.management_title or "—"),
        ("Период", f"{data.date_from:%d.%m.%Y} — {data.date_to:%d.%m.%Y}"),
        ("Сформирован", f"{_fmt_date(data.generated_at, with_time=True)}, {data.generated_by}"),
    ]
    for label, value in info:
        paragraph = document.add_paragraph()
        paragraph.paragraph_format.space_after = Pt(2)
        paragraph.add_run(f"{label}: ").bold = True
        paragraph.add_run(value)

    employees = sorted(
        data.employees,
        key=lambda e: (ROLE_ORDER.get(e.status, 9), e.full_name.lower()),
    )
    total = sum(len(e.tasks) for e in employees)

    document.add_heading("Сводка", level=1)
    summary_widths = [1.0, 8.0, 5.0, 3.0]
    summary = _table(document, ["№", "Сотрудник", "Должность", "Выполнено"], summary_widths)
    for number, employee in enumerate(employees, start=1):
        _add_row(summary, [
            str(number),
            employee.full_name,
            ROLE_LABELS.get(employee.status, employee.status),
            str(len(employee.tasks)),
        ], summary_widths)
    total_row = summary.add_row().cells
    total_row[0].merge(total_row[2]).text = ""
    total_row[0].paragraphs[0].add_run("Итого").bold = True
    total_row[3].text = ""
    total_row[3].paragraphs[0].add_run(str(total)).bold = True

    document.add_heading("Задачи по сотрудникам", level=1)
    task_widths = [1.0, 7.0, 2.6, 2.6, 2.8]
    for employee in employees:
        document.add_heading(
            f"{employee.full_name} — {ROLE_LABELS.get(employee.status, employee.status)}",
            level=2,
        )
        if not employee.tasks:
            document.add_paragraph("За период выполненных задач нет.").runs[0].italic = True
            continue
        late = sum(1 for task in employee.tasks if _is_late(task))
        line = f"Выполнено: {_plural_tasks(len(employee.tasks))}"
        if late:
            line += f", из них с нарушением срока: {late}"
        document.add_paragraph(line)

        table = _table(document, ["№", "Задача", "Поручена", "Срок", "Выполнена"], task_widths)
        for number, task in enumerate(employee.tasks, start=1):
            title_text = task.title + (f"\nОт: {task.author_name}" if task.author_name else "")
            done_text = _fmt_date(task.done_at) + (" (с опозданием)" if _is_late(task) else "")
            _add_row(table, [
                str(number),
                title_text,
                _fmt_date(task.created_at),
                _fmt_date(task.deadlines),
                done_text,
            ], task_widths)

    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()
