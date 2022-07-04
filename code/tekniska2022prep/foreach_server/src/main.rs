use anyhow::{anyhow, Context, Result};
use serialport::SerialPort;
use std::time::Duration;

use nannou_osc as osc;
use nannou_osc::Type;

fn main() -> Result<()> {
    println!("Hello, world!");
    // Set up serialport communication
    let serial_port = match open_serial() {
        Ok(port) => Some(port),
        Err(e) => {
            eprintln!("Failed to open port: {e}");
            None
        }
    };
    // Set up OSC communication
    let main_screen_port = 12345;
    let code_screen_port = 12346;
    let supercollider_port = 57120;

    let main_screen_sender = osc::sender()?.connect(format!("127.0.0.1:{}", main_screen_port))?;
    let code_screen_sender = osc::sender()?.connect(format!("127.0.0.1:{}", code_screen_port))?;
    let supercollider_sender =
        osc::sender()?.connect(format!("127.0.0.1:{}", supercollider_port))?;

    Ok(())
}

fn open_serial() -> Result<Box<dyn SerialPort>> {
    let ports = serialport::available_ports().context("No ports found!")?;
    for p in ports {
        println!("{}", p.port_name);
        if p.port_name == "/dev/ttyACM0" {
            let port = serialport::new("/dev/ttyUSB0", 115_200)
                .timeout(Duration::from_millis(10))
                .open()?;
            return Ok(port);
        }
    }
    Err(anyhow!("No eligible serial port could be connected to"))
}

fn main_loop() {}
