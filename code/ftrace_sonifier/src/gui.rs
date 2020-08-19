use super::event_stats::EventStat;
use std::sync::{Arc, Mutex};
type ArcMutex<T> = Arc<Mutex<T>>;

use nannou::draw::Draw;
use nannou::geom::rect::Rect;
use nannou::geom::point::Point2;
use nannou::prelude::*;

trait GuiElement {
    fn draw(&self, draw: &mut Draw, relative_pos: Point2);
    fn click(&mut self, point: Point2);
    fn contains(&self, point: Point2) -> bool;
}
struct GuiContainer {
    elements: Vec<Box<dyn GuiElement>>,
    bounding_box: Rect,
}

impl GuiElement for GuiContainer {
    fn draw(&self, draw: &mut Draw, relative_pos: Point2) {

    }
    fn click(&mut self, point: Point2) {
        if self.bounding_box.contains(point) {
            for e in &mut self.elements {
                e.click(point);
            }
        }
    }
    fn contains(&self, point: Point2) -> bool {
        self.bounding_box.contains(point)
    }
}



struct ToggleBox {
    active: bool,
    hover: bool,
    symbol: Symbol,
    text: String,
    action: Action,
    bounding_box: Rect,
}

impl ToggleBox {
    pub fn new()
}

impl GuiElement for ToggleBox {
    fn draw(&self, draw: &mut Draw, relative_pos: Point2) {

    }
    fn click(&mut self, point: Point2) {
        if self.bounding_box.contains(point) {
            self.active = !self.active;
            self.symbol.toggle_active();
        }
    }
    fn contains(&self, point: Point2) -> bool {
        self.bounding_box.contains(point)
    }
}

enum Symbol {
    Toggle{size: f32, active: bool},
    Diamond{size: f32, active: bool},
}

impl Symbol {
    pub fn toggle_active(&mut self) {
        match self  {
            Symbol::Toggle{size, active} => *active = !*active,
            Symbol::Diamond{size, active} => *active = !*active,
        }
    }

    fn draw(&self, draw: &mut Draw, relative_pos: Point2) {
        match self {
            Symbol::Toggle{size, active} => {
                if *active {
                    draw.rect()
                    .xy(relative_pos)
                    .w_h(*size, *size)
                    .color(BLACK);
                } else {
                    draw.rect()
                    .xy(relative_pos)
                    .w_h(*size, *size)
                    .no_fill()
                    .stroke_color(BLACK);
                }
            }
            Symbol::Diamond{size, active} => {
                draw.rect()
                    .xy(relative_pos)
                    .w_h(*size, *size)
                    .rotate(PI * 0.5)
                    .no_fill()
                    .stroke_color(BLACK);
            }
        }
    }
}

struct Action {
    action_type: ActionType,
    event_stat: ArcMutex<EventStat>
}

enum ActionType {
    ToggleMute,

}