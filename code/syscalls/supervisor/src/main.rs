use chrono::{Timelike, Utc};
use nannou_osc::receiver;
use serde::{Deserialize, Serialize};
use std::{
    fs::File,
    io::Write,
    path::PathBuf,
    process::{Child, Command},
    time::{Duration, Instant, SystemTime},
};

const RECEIVER_PORT: u16 = 57103;

enum Message {
    CompleteRestart,
    Continue,
}
fn main() {
    println!("Starting reinverse supervisor!");
    let (tx, rx) = std::sync::mpsc::channel();

    let args: Vec<String> = std::env::args().collect();

    let settings_file = &args
        .get(1)
        .map(|s| s.as_str())
        .unwrap_or("settings_example.json");

    let settings: Vec<ProcessSetting> = match std::fs::read_to_string(settings_file) {
        Ok(s) => match serde_json::from_str(&s) {
            Ok(settings) => settings,
            Err(e) => {
                eprintln!("Failed to parse json in file {}", settings_file);
                vec![]
            }
        },
        Err(e) => {
            eprintln!("Failed to read file {settings_file}: {e}");
            vec![]
        }
    };

    // let settings_example = vec![

    //             ProcessSetting::new(
    //     "C:\\Program Files\\JACK2\\qjackctl\\qjackctl.exe",
    //     "C:\\Program Files\\JACK2"
    //         ).wait_after_restart(10).complete_restart(true),
    //             ProcessSetting::new(
    //                 "C:\\Program Files\\REAPER (x64)\\reaper.exe",
    //     "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\REAPER (x64)"
    //         ).wait_after_restart(10).complete_restart(true),
    //             ProcessSetting::new(
    //                 "C:/Users/reth/Documents/git/rethread/code/NWL2023/conductor/target/release/conductor.exe",
    //                 "C:/Users/reth/Documents/git/rethread/code/NWL2023/conductor/",
    //         ).recompilation_command("cargo build --release".to_string()),
    //         ProcessSetting::new(
    //             "C:/Users/reth/Documents/git/rethread/code/NWL2023/trace_sonifier/target/release/combined.exe",
    //             "C:/Users/reth/Documents/git/rethread/code/NWL2023/trace_sonifier/",
    //     ).recompilation_command("cargo build --release --bin combined".to_string()),
    // ];

    // let json = serde_json::to_string_pretty(&settings_example).unwrap();
    // let mut output = File::create("settings_example.json").unwrap();
    // write!(output, "{}", json).unwrap();

    ctrlc::set_handler(move || tx.send(()).expect("Could not send signal on channel."))
        .expect("Error setting Ctrl-C handler");
    let vec = vec![
        // Windows
                Process::new(
        "C:\\Program Files\\JACK2\\qjackctl\\qjackctl.exe",
        "C:\\Program Files\\JACK2"
            ).wait_after_restart(Duration::from_secs(10)).complete_restart(true),
                Process::new(
                    "C:\\Program Files\\REAPER (x64)\\reaper.exe",
        "C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\REAPER (x64)"
            ).wait_after_restart(Duration::from_secs(10)).complete_restart(true),
                Process::new(
                    "C:/Users/reth/Documents/git/rethread/code/NWL2023/conductor/target/release/conductor.exe",
                    "C:/Users/reth/Documents/git/rethread/code/NWL2023/conductor/",
            ).recompilation_command("cargo build --release".to_string()),
            Process::new(
                "C:/Users/reth/Documents/git/rethread/code/NWL2023/trace_sonifier/target/release/combined.exe",
                "C:/Users/reth/Documents/git/rethread/code/NWL2023/trace_sonifier/",
        ).recompilation_command("cargo build --release --bin combined".to_string()),

        // Linux
        // Process::new(
        //     "/home/erik/Program/reaper_linux_x86_64/REAPER/reaper",
        //     "/home/erik/Program/reaper_linux_x86_64/REAPER/",
        // )
        // .wait_after_restart(Duration::from_secs(10))
        // .complete_restart(true),
        // Process::new(
        //     "/home/erik/code/kth/rethread/code/NWL2023/conductor/target/release/conductor",
        //     "/home/erik/code/kth/rethread/code/NWL2023/conductor/",
        // )
        // .recompilation_command("cargo build --release".to_string()),
        // Process::new(
        //     "/home/erik/code/kth/rethread/code/NWL2023/trace_sonifier/target/release/combined",
        //     "/home/erik/code/kth/rethread/code/NWL2023/trace_sonifier/",
        // )
        // .recompilation_command("cargo build --release --bin combined".to_string()),
    ];
    let mut processes: Vec<Process> = settings.into_iter().map(|p| p.into()).collect();
    // Time in UTC+0
    let start_hour = 15;
    let start_minute = 00;
    let stop_hour = 21;
    let stop_minute = 00;
    let mut complete_restart = true;
    let mut recompile = false;
    let mut resting = true; // We are resting 22-16 which means, don't try to restart
    let mut always_on = true; // Overrides the resting option, trying to keep the programs going no matter what
    let mut osc_receiver = { receiver(RECEIVER_PORT).ok() };
    // let start_time = todo!();
    // let mut rng: StdRng = SeedableRng::from_entropy();
    loop {
        std::thread::sleep(Duration::from_secs(1));
        let now = Utc::now();
        // println!(
        //         "The current UTC time is {:02}:{:02}:{:02} ",
        //         now.hour(),
        //         now.minute(),
        //         now.second(),
        //     );
        if !always_on {
            complete_restart = false;
            if resting {
                if now.hour() >= start_hour
                    && now.minute() >= start_minute
                    && !(now.hour() >= stop_hour && now.minute() >= stop_minute)
                {
                    resting = false;
                    complete_restart = true;
                }
            } else {
                if (now.hour() >= stop_hour && now.minute() >= stop_minute)
                    || !(now.hour() >= start_hour && now.minute() >= start_minute)
                {
                    resting = true;
                    for p in &mut processes {
                        p.stop();
                    }
                }
            }
        }

        if !resting || always_on {
            for p in &mut processes {
                match p.update() {
                    Message::CompleteRestart => {
                        complete_restart = true;
                        break;
                    }
                    Message::Continue => (),
                }
            }
        }
        if let Some(osc) = &mut osc_receiver {
            if let Ok(Some((packet, _socket))) = osc.try_recv() {
                for mess in packet.into_msgs() {
                    match mess.addr.as_str() {
                        "/restart" => {
                            complete_restart = true;
                        }
                        "/recompile" => {
                            recompile = true;
                        }
                        "/always_on" => {
                            always_on = true;
                            complete_restart = true;
                        }
                        "/follow_start_end" => {
                            always_on = false;
                        }
                        _ => {
                            eprintln!(
                                "Received unknown message to supervisor at address {}",
                                mess.addr.as_str()
                            );
                        }
                    }
                }
            }
        }
        if complete_restart || recompile {
            for p in &mut processes {
                p.stop();
            }
        }
        if recompile {
            for p in &mut processes {
                p.recompile();
            }
        }
        if complete_restart || recompile {
            complete_restart = false;
            recompile = false;
            for p in &mut processes {
                p.restart();
            }
        }
        if let Ok(()) = rx.try_recv() {
            break;
        }
    }
    for mut p in processes {
        p.stop();
    }
}

#[derive(Clone, Deserialize, Serialize)]
struct ProcessSetting {
    path: String,
    working_dir: String,
    recompilation_command: Option<String>,
    max_time_alive_before_restart_secs: u32,
    wait_after_restart_secs: u32,
    trigger_complete_restart_on_fail: bool,
}
impl ProcessSetting {
    pub fn new(path: impl Into<String>, working_dir: impl Into<String>) -> Self {
        Self {
            path: path.into(),
            working_dir: working_dir.into(),
            max_time_alive_before_restart_secs: 12 * 60 * 60,
            wait_after_restart_secs: 1,
            trigger_complete_restart_on_fail: false,
            recompilation_command: None,
        }
    }
    pub fn complete_restart(mut self, complete_restart: bool) -> Self {
        self.trigger_complete_restart_on_fail = complete_restart;
        self
    }
    pub fn wait_after_restart(mut self, wait_time: u32) -> Self {
        self.wait_after_restart_secs = wait_time;
        self
    }
    pub fn max_time_alive_before_restart(mut self, seconds: u32) -> Self {
        self.max_time_alive_before_restart_secs = seconds;
        self
    }
    pub fn recompilation_command(mut self, recompilation_command: String) -> Self {
        self.recompilation_command = Some(recompilation_command);
        self
    }
}
impl Into<Process> for ProcessSetting {
    fn into(self) -> Process {
        Process {
            last_start: Instant::now(),
            path: self.path.into(),
            working_dir: self.working_dir.into(),
            recompilation_command: self.recompilation_command,
            max_time_alive_before_restart: Duration::from_secs(
                self.max_time_alive_before_restart_secs as u64,
            ),
            current_child_process: None,
            trigger_complete_restart_on_fail: self.trigger_complete_restart_on_fail,
            wait_after_restart: Duration::from_secs(self.wait_after_restart_secs as u64),
        }
    }
}

struct Process {
    last_start: Instant,
    path: PathBuf,
    working_dir: PathBuf,
    recompilation_command: Option<String>,
    max_time_alive_before_restart: Duration,
    current_child_process: Option<Child>,
    trigger_complete_restart_on_fail: bool,
    wait_after_restart: Duration,
}
impl Process {
    pub fn new(path: impl Into<PathBuf>, working_dir: impl Into<PathBuf>) -> Self {
        Self {
            last_start: Instant::now(),
            path: path.into(),
            working_dir: working_dir.into(),
            max_time_alive_before_restart: Duration::from_secs(90 * 60),
            current_child_process: None,
            trigger_complete_restart_on_fail: false,
            wait_after_restart: Duration::from_secs(0),
            recompilation_command: None,
        }
    }
    pub fn complete_restart(mut self, complete_restart: bool) -> Self {
        self.trigger_complete_restart_on_fail = complete_restart;
        self
    }
    pub fn wait_after_restart(mut self, wait_time: Duration) -> Self {
        self.wait_after_restart = wait_time;
        self
    }
    pub fn recompilation_command(mut self, recompilation_command: String) -> Self {
        self.recompilation_command = Some(recompilation_command);
        self
    }
    pub fn recompile(&mut self) {
        if let Some(recompilation_command) = &self.recompilation_command {
            let parts: Vec<_> = recompilation_command.split_ascii_whitespace().collect();
            let mut command = Command::new(parts[0]);
            command.current_dir(&self.working_dir).args(&parts[1..]);
            match command.output() {
                Ok(output) => eprintln!("Successful recompile!\n{output:?}"),
                Err(e) => eprintln!("Error recompiling: {e}"),
            }
        }
    }
    pub fn restart(&mut self) {
        if let Some(mut child) = self.current_child_process.take() {
            if let Err(e) = child.kill() {
                eprintln!("Failed to kill child process: {e}");
            }
        }
        match Command::new("konsole")
            .current_dir(&self.working_dir)
            .arg("-e")
            .arg(&self.path)
            .spawn()
        {
            Ok(child) => {
                self.current_child_process = Some(child);
                self.last_start = Instant::now();
            }
            Err(e) => eprintln!("Failed to start process at {:?}, {e}", &self.path),
        }
        self.last_start = Instant::now();
        std::thread::sleep(self.wait_after_restart.clone());
    }
    pub fn stop(&mut self) {
        if let Some(mut child) = self.current_child_process.take() {
            if let Err(e) = child.kill() {
                eprintln!("Failed to kill child process: {e}");
            }
        }
    }
    pub fn update(&mut self) -> Message {
        if let Some(child) = &mut self.current_child_process {
            match child.try_wait() {
                Ok(Some(exit_status)) => {
                    eprintln!(
                        "{:?} has exited with status {exit_status}, attempting to restart",
                        self.path
                    );
                    if self.trigger_complete_restart_on_fail {
                        return Message::CompleteRestart;
                    } else {
                        self.restart();
                    }
                }
                Ok(None) => {}
                Err(e) => eprintln!(
                    "Error attempting to check exit status of process {:?}: {e}",
                    self.path
                ),
            }
            if self.last_start.elapsed() > self.max_time_alive_before_restart {
                eprintln!(
                    "Process {:?} has reached its max time limit, restarting.",
                    self.path
                );
                if self.trigger_complete_restart_on_fail {
                    return Message::CompleteRestart;
                } else {
                    self.restart();
                }
            }
        }
        Message::Continue
    }
}
