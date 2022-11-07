use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, Mutex},
};

use futures_channel::mpsc::{unbounded, UnboundedSender};
use futures_util::{future, pin_mut, stream::TryStreamExt, StreamExt};
use log::*;

use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::tungstenite::protocol::Message;

type Tx = UnboundedSender<Message>;
type ClientMap = Arc<Mutex<HashMap<SocketAddr, Tx>>>;

async fn handle_connection(peer_map: ClientMap, raw_stream: TcpStream, addr: SocketAddr) {
    info!("Incoming TCP connection from: {}", addr);

    match tokio_tungstenite::accept_async(raw_stream).await {
        Ok(ws_stream) => {
            info!("WebSocket connection established: {}", addr);

            // Insert the write part of this peer to the peer map.
            let (tx, rx) = unbounded();
            peer_map.lock().unwrap().insert(addr, tx);

            let (outgoing, incoming) = ws_stream.split();

            let broadcast_incoming = incoming.try_for_each(|msg| {
                info!(
                    "Received a message from {}: {}",
                    addr,
                    msg.to_text().unwrap()
                );
                let peers = peer_map.lock().unwrap();

                // We want to broadcast the message to everyone except ourselves.
                let broadcast_recipients = peers
                    .iter()
                    .filter(|(peer_addr, _)| peer_addr != &&addr)
                    .map(|(_, ws_sink)| ws_sink);

                for recp in broadcast_recipients {
                    match recp.unbounded_send(msg.clone()) {
                        Err(e) => {
                            error!("Failed to send message to websocket client: {e:?}");
                        }
                        _ => (),
                    }
                }

                future::ok(())
            });

            let receive_from_others = rx.map(Ok).forward(outgoing);

            pin_mut!(broadcast_incoming, receive_from_others);
            future::select(broadcast_incoming, receive_from_others).await;

            info!("{} disconnected", &addr);
            peer_map.lock().unwrap().remove(&addr);
        }
        Err(e) => {
            error!("Error during the websocket handshake occurred: {e:?}");
        }
    }
}
async fn pass_on_json_to_clients(state: ClientMap, receiver: crossbeam::channel::Receiver<String>) {
    loop {
        while let Ok(json) = receiver.try_recv() {
            let clients = state.lock().unwrap();
            let message = Message::text(json);
            // let message = Message::binary(format!("Counter is: {counter}\n").as_bytes());
            for client in clients.iter().map(|(_, sender)| sender) {
                client.unbounded_send(message.clone()).unwrap();
            }
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(5)).await;
    }
}

#[tokio::main]
async fn tokio_main(receiver: crossbeam::channel::Receiver<String>) {
    let addr = "127.0.0.1:12345".to_string();

    let state = ClientMap::new(Mutex::new(HashMap::new()));

    // Create the event loop and TCP listener we'll accept connections on.
    let try_socket = TcpListener::bind(&addr).await;
    match try_socket {
        Ok(listener) => {
            info!("Listening on: {}", addr);

            tokio::spawn(pass_on_json_to_clients(state.clone(), receiver));

            // Let's spawn the handling of each connection in a separate task.
            while let Ok((stream, addr)) = listener.accept().await {
                tokio::spawn(handle_connection(state.clone(), stream, addr));
            }
        }
        Err(e) => {
            error!("Failed to bind websocket TcpListener: {e:?}");
        }
    }
}

pub fn start_websocket_thread() -> crossbeam::channel::Sender<String> {
    let (json_tx, json_rx) = crossbeam::channel::unbounded();
    // Start a new thread running the tokio async runtime
    std::thread::spawn(move || tokio_main(json_rx));

    json_tx
}

pub struct WebsocketCom {
    pub sender: crossbeam::channel::Sender<String>,
}
impl Default for WebsocketCom {
    fn default() -> Self {
        let sender = start_websocket_thread();
        Self { sender }
    }
}
