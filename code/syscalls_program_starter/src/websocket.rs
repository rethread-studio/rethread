use std::time::Duration;

use tungstenite::{connect, Message};
use url::Url;

pub enum WebsocketMess {
    Movement {
        id: i32,
        is_break: bool,
        next_mvt: Option<i32>,
        duration: f32,
    },
}
pub fn start_websocket_thread() -> std::sync::mpsc::Receiver<WebsocketMess> {
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || loop {
        if let Ok((mut socket, response)) = connect(Url::parse("ws://192.168.53.4:1237").unwrap()) {
            println!("Connected to the server");
            println!("Response HTTP code: {}", response.status());
            println!("Response contains the following headers:");
            for (ref header, _value) in response.headers() {
                println!("* {}", header);
            }

            loop {
                match socket.read() {
                    Ok(mess) => {
                        if let Message::Text(t) = mess {
                            let t: Vec<&str> = t.split(':').collect();
                            if let Some(addr) = t.get(0) {
                                if *addr == "/new_movement" {
                                    let args: Vec<_> = t[1].split(',').collect();
                                    if args.len() == 4 {
                                        let id = args[0].parse::<i32>().unwrap();
                                        let is_break = args[1] == "true";
                                        let next_mvt = args[2].parse::<i32>().unwrap();
                                        let next_mvt =
                                            if next_mvt == -1 { None } else { Some(next_mvt) };
                                        let duration =
                                            args[3].parse::<usize>().unwrap() as f32 / 1000.;
                                        tx.send(WebsocketMess::Movement {
                                            id,
                                            is_break,
                                            next_mvt,
                                            duration,
                                        })
                                        .ok();
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to get websocket message");
                        break;
                    }
                }
                std::thread::sleep(Duration::from_secs_f32(0.01));
            }
        }
    });
    rx
}

// let mess = format!(
//     "/new_movement:{},{},{},{}",
//     m.id,
//     m.is_break,
//     next_mvt.map(|mvt| mvt.id as i32).unwrap_or(-1),
//     m.duration.as_millis()
// );
