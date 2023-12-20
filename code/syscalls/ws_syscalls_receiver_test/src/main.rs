//! A simple example of hooking up stdin/stdout to a WebSocket stream.
//!
//! This example will connect to a server specified in the argument list and
//! then forward all data read on stdin to the server, printing out all data
//! received on stdout.
//!
//! Note that this is not currently optimized for performance, especially around
//! buffer management. Rather it's intended to show an example of working with a
//! client.
//!
//! You can use this example together with the `server` example.

use std::{env, sync::atomic::AtomicU64};

use color_eyre::Result;
use futures_util::{future, pin_mut, SinkExt, StreamExt};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

#[tokio::main]
async fn main() -> Result<()> {
    let connect_addr = "ws://127.0.0.1:8080";
    let connect_addr = env::args()
        .nth(1)
        .unwrap_or(connect_addr.to_string());
    println!("Connecting to {connect_addr}");
    let url = url::Url::parse(&connect_addr).unwrap();

    let (stdin_tx, stdin_rx) = futures_channel::mpsc::unbounded();
    tokio::spawn(read_stdin(stdin_tx));

    let (ws_stream, _) = connect_async(url).await.expect("Failed to connect");
    println!("WebSocket handshake has been successfully completed");

    tokio::io::stdout()
        .write_all(b"Writing to output")
        .await
        .unwrap();

    {
        let (mut write, read) = ws_stream.split();
        write
            .send(Message::Text("Hi from receiver".to_string()))
            .await
            .ok();

        // let stdin_to_ws = stdin_rx.map(Ok).forward(write);
        // let ws_to_stdout = {
        //     read.for_each(|message| async {
        //         // let data = message.unwrap().into_data();
        //         // tokio::io::stdout().write_all(&data).await.unwrap();
        //         let text = message.unwrap().into_text().unwrap();
        //         println!("{text}");
        //     })
        // };
        // loop {
        //     let message = ws_stream.next().await;
        //     println!("Received message");
        //     if let Some(message) = message {
        //         let text = message.unwrap().into_text().unwrap();
        //         println!("{text}");
        //     }
        //     ws_stream.
        // }

        let messages_received = AtomicU64::new(0);
        let read_future = read.for_each(|message| async {
            // println!("receiving...");
            // let data = message.unwrap().into_data();
            let text = message.unwrap().into_text().unwrap();
            if text.chars().nth(0).unwrap() != 's' {
                tokio::io::stdout().write(&text.as_bytes()).await.unwrap();
                tokio::io::stdout().write(&['\n' as u8]).await.unwrap();
            }
            // let val = messages_received.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            // println!("{val}");
            // println!("received...");
        });

        read_future.await;
    }

    Ok(())

    // pin_mut!(stdin_to_ws, ws_to_stdout);
    // future::select(stdin_to_ws, ws_to_stdout).await;
}

// Our helper method which will read data from stdin and send it along the
// sender provided.
async fn read_stdin(tx: futures_channel::mpsc::UnboundedSender<Message>) {
    let mut stdin = tokio::io::stdin();
    loop {
        let mut buf = vec![0; 1024];
        let n = match stdin.read(&mut buf).await {
            Err(_) | Ok(0) => break,
            Ok(n) => n,
        };
        buf.truncate(n);
        tx.unbounded_send(Message::binary(buf)).unwrap();
    }
}
