use enum_iterator::Sequence;
use num_enum::TryFromPrimitive;
use ratatui::{
    backend::Backend,
    layout::Constraint,
    style::{Color, Modifier, Style},
    widgets::{Block, Borders, Cell, Row, Table},
    Frame,
};

use crate::App;

#[derive(Copy, Clone, Debug, PartialEq, Eq, TryFromPrimitive, Sequence)]
#[repr(u8)]
pub enum MenuItem {
    PlayScore,
    PlayRandomMovements,
    NextMovement,
    PreviousMovement,
    StopScorePlayback,
    LoadRecordedData,
    StartPlayback,
    PausePlayback,
    ResetPlayback,
    RecordData,
    StopRecording,
    StopAndSaveRecording,
    StopAndSaveRecordingJson,
    Exit,
}

pub fn menu_ui<B: Backend>(f: &mut Frame<B>, state: &mut App, rect: ratatui::layout::Rect) {
    let selected_style = Style::default().add_modifier(Modifier::REVERSED);
    let normal_style = Style::default().bg(Color::Blue);
    let header_cells = ["Actions"]
        .iter()
        .map(|h| Cell::from(*h).style(Style::default().fg(Color::Red)));
    let header = Row::new(header_cells)
        .style(normal_style)
        .height(1)
        .bottom_margin(1);
    let rows =
        enum_iterator::all::<MenuItem>().map(|p| Row::new(vec![Cell::from(format!("{p:?}"))]));

    let t = Table::new(rows)
        .header(header)
        .block(
            Block::default()
                .border_style(Style::default().fg(if state.is_recording {
                    Color::Red
                } else {
                    Color::White
                }))
                .borders(Borders::ALL)
                .title("Main menu"),
        )
        .highlight_style(selected_style)
        .highlight_symbol(">> ")
        .widths(&[Constraint::Percentage(100)]);
    f.render_stateful_widget(t, rect, &mut state.menu_table_state);
}
