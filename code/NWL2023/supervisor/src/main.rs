use std::{
    path::PathBuf,
    process::{Child, Command},
    time::{Duration, Instant},
};

enum Message {
    CompleteRestart,
    Continue,
}
fn main() {
    println!("Starting reinverse supervisor!");
    let (tx, rx) = std::sync::mpsc::channel();

    ctrlc::set_handler(move || tx.send(()).expect("Could not send signal on channel."))
        .expect("Error setting Ctrl-C handler");
    let vec = vec![
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
    ),

        Process::new(
            "C:/Users/reth/Documents/git/rethread/code/NWL2023/trace_sonifier/target/release/combined.exe",
            "C:/Users/reth/Documents/git/rethread/code/NWL2023/trace_sonifier/",
        ),
        ];
    let mut processes = vec;
    for p in &mut processes {
        p.restart();
    }
    let mut complete_restart = false;
    loop {
        std::thread::sleep(Duration::from_secs(1));
        for p in &mut processes {
            match p.update() {
                Message::CompleteRestart => {
                    complete_restart = true;
                    break;
                }
                Message::Continue => (),
            }
        }
        if complete_restart {
            complete_restart = false;

            for p in &mut processes {
                p.stop();
            }
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

struct Process {
    last_start: Instant,
    path: PathBuf,
    working_dir: PathBuf,
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
            max_time_alive_before_restart: Duration::from_secs(60 * 60),
            current_child_process: None,
            trigger_complete_restart_on_fail: false,
            wait_after_restart: Duration::from_secs(0),
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
    pub fn restart(&mut self) {
        if let Some(mut child) = self.current_child_process.take() {
            if let Err(e) = child.kill() {
                eprintln!("Failed to kill child process: {e}");
            }
        }
        match Command::new(&self.path)
            .current_dir(&self.working_dir)
            .spawn()
        {
            Ok(child) => {
                self.current_child_process = Some(child);
                self.last_start = Instant::now();
            }
            Err(e) => eprintln!("Failed to start process at {:?}, {e}", &self.path),
        }
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
            }
        }
        Message::Continue
    }
}
