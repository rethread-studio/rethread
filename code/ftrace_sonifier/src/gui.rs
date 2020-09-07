use super::event_stats::EventStat;
use std::sync::{Arc, Mutex};
type ArcMutex<T> = Arc<Mutex<T>>;

use nannou::draw::Draw;
use nannou::geom::rect::Rect;
use nannou::geom::point::Point2;
use nannou::prelude::*;

pub trait GuiElement {
    fn draw(&self, draw: &Draw, relative_pos: Point2);
    fn click(&mut self, point: Point2);
    fn contains(&self, point: Point2) -> bool;
    fn bounding_box(&self) -> &Rect;
    fn set_bounding_box(&mut self, bounding_box: Rect);
}
pub struct GuiContainer {
    elements: Vec<Box<dyn GuiElement>>,
    bounding_box: Rect,
}

impl GuiContainer {
    pub fn new(xy: Point2) -> Self  {
        GuiContainer {
            elements: vec![],
            bounding_box: Rect::from_xy_wh(xy, vec2(0.0, 0.0)),
        }
    }
    pub fn add_element(&mut self, element: Box<dyn GuiElement>) {
        self.elements.push(element);
        self.adjust_size_to_elements();
    }
    pub fn add_element_beneath(&mut self, mut element: Box<dyn GuiElement>) {
        let new_bounding_box = element.bounding_box().below(self.elements.last().unwrap().bounding_box().clone());
        // println!("old: {:?}, new: {:?}", element.bounding_box(), new_bounding_box);
        // println!("xy: {:?}", new_bounding_box.xy());
        element.set_bounding_box(new_bounding_box);
        self.elements.push(element);
        self.adjust_size_to_elements();
    }
    pub fn adjust_size_to_elements(&mut self) {
        let mut min_x = std::f32::MAX;
        let mut min_y = std::f32::MAX;
        let mut max_x = 0.0;
        let mut max_y = 0.0;
        for elem in &mut self.elements {
            if elem.bounding_box().left() < min_x {
                min_x = elem.bounding_box().left();
            }
            if elem.bounding_box().right() > max_x {
                max_x = elem.bounding_box().right();
            }
            if elem.bounding_box().top() > max_y {
                max_y = elem.bounding_box().top();
            }
            if elem.bounding_box().bottom() < min_y {
                min_y = elem.bounding_box().bottom();
            }
        }
        println!("current: {:?}, min: {}, {}, max: {}, {}", self.bounding_box, min_x, min_y, max_x, max_y);
        let mut new_bounding_box = Rect::from_corners(pt2(min_x, min_y), pt2(max_x, max_y));
        println!("new GuiContainer bounding box: {:?}, xy: {:?}", new_bounding_box, new_bounding_box.xy());
        let diff = self.bounding_box.xy() - new_bounding_box.xy();
        println!("diff: {:?}", diff);
        
        // Because the boudning box denotes the center and edges of the box and the 
        // elements in the container are to be drawn relative to the container
        // we need to move all of the elements every time we resize the box.
        for elem in &mut self.elements {
            elem.set_bounding_box(elem.bounding_box().shift_x(diff.x).shift_y(diff.y));
        }
        // We also need to shift the container box so that it's in sync with the element positions
        new_bounding_box = new_bounding_box.shift_x(diff.x).shift_y(diff.y);
        self.set_bounding_box(new_bounding_box);
    }
}

impl GuiElement for GuiContainer {
    fn draw(&self, draw: &Draw, relative_pos: Point2) {
        draw.rect()
            .xy(self.bounding_box.xy() + relative_pos)
            .wh(self.bounding_box.wh())
            .color(PINK);
        draw.rect()
            .xy(self.bounding_box.xy() + relative_pos)
            .wh(self.bounding_box.wh())
            .stroke_color(BLACK)
            .no_fill()
            .stroke_weight(1.0);
        let new_relative_pos = relative_pos + self.bounding_box.xy(); //pt2(self.bounding_box.x.end, self.bounding_box.y.end);
        // println!("GuiContainer relative: {:?}", new_relative_pos);
        for e in &self.elements {
            e.draw(draw, new_relative_pos);
        }
    }
    fn click(&mut self, point: Point2) {
        if self.bounding_box.contains(point) {
            let relative_point = point + self.bounding_box.xy();
            for e in &mut self.elements {
                e.click(relative_point);
            }
        }
    }
    fn contains(&self, point: Point2) -> bool {
        self.bounding_box.contains(point)
    }
    fn bounding_box(&self) -> &Rect {
        &self.bounding_box
    }
    fn set_bounding_box(&mut self, mut bounding_box: Rect) {
        self.bounding_box = bounding_box;
    }
}


pub struct ToggleBox {
    active: bool,
    hover: bool,
    symbol: Symbol,
    text: String,
    action: Action,
    bounding_box: Rect,
}

impl ToggleBox {
    pub fn new(text: String, size: f32, width: f32, action: Action) -> Self {
        let mut tb = ToggleBox {
            active: false,
            hover: false,
            symbol: Symbol::new(size, SymbolType::Toggle),
            text,
            action,
            bounding_box: Rect::from_w_h(width, size),
        };
        tb.symbol.bounding_box = tb.symbol.bounding_box.align_left_of(tb.bounding_box);
        tb.symbol.bounding_box = tb.symbol.bounding_box.align_top_of(tb.bounding_box);
        tb
    }
}

impl GuiElement for ToggleBox {
    fn draw(&self, draw: &Draw, relative_pos: Point2) {
        // let local_pos = relative_pos + pt2(self.bounding_box.x.start, self.bounding_box.y.start);
        let local_pos = relative_pos;
        let text_pos = local_pos + self.bounding_box.xy();
        // println!("text position: {}, {}", relative_pos.x + self.bounding_box.x.start, text_pos.y);
        draw.text(&self.text)
            .x_y(relative_pos.x + self.bounding_box.x() + self.symbol.size, relative_pos.y + self.bounding_box.y())
            .align_text_middle_y()
            .left_justify()
            .w_h(self.bounding_box.w() - self.symbol.size, self.bounding_box.h())
            .color(BLACK);
        self.symbol.draw(draw, relative_pos);
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
    fn bounding_box(&self) -> &Rect {
        &self.bounding_box
    }
    fn set_bounding_box(&mut self, bounding_box: Rect) {
        println!("new Toggle bounding box: {:?}, xy: {:?}", bounding_box, bounding_box.xy());
        self.bounding_box = bounding_box;
        self.symbol.bounding_box = self.symbol.bounding_box.align_left_of(self.bounding_box);
        self.symbol.bounding_box = self.symbol.bounding_box.align_top_of(self.bounding_box);
    }
}

enum SymbolType {
    Toggle,
    Diamond,
}

struct Symbol {
    size: f32,
    bounding_box: Rect,
    active: bool,
    symbol_type: SymbolType,
}

impl Symbol {
    pub fn new(size: f32, symbol_type: SymbolType) -> Self {
        let bounding_box = Rect::from_w_h(size, size);
        Symbol {
            size,
            bounding_box,
            active: false,
            symbol_type,
        }
    }
    pub fn toggle_active(&mut self) {
        self.active = !self.active;
    }

    fn draw(&self, draw: &Draw, relative_pos: Point2) {
        let local_pos = self.bounding_box.xy() + relative_pos;
        let Symbol{active, size, ..} = self; // destructure
        match &self.symbol_type {
            SymbolType::Toggle => {
                if *active {
                    draw.rect()
                        .xy(local_pos)
                        .w_h(*size, *size)
                        .color(BLACK);
                } else {
                    draw.rect()
                        .xy(local_pos)
                        .w_h(*size, *size)
                        .no_fill()
                        .stroke_weight(2.0)
                        .stroke_color(BLACK);
                }
            }
            SymbolType::Diamond => {
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

pub struct Action {
    action: Box<dyn FnMut()>
}

impl Action {
    pub fn new(action: Box<dyn FnMut()>) -> Self {
        Action {
            action
        }
    }
    pub fn run(&mut self) {
        (self.action)();
    }
}