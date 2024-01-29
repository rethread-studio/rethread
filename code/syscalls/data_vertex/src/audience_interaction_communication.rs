use std::sync::mpsc::SyncSender;

use anyhow::Result;
use log::*;
use nannou_osc::{Connected, Receiver, Sender, Type};

pub enum AudienceUiMessage {
    // From Ui program to data_vertex
    ActivateProgram(String),
    DeactivateProgram(String),
    RequestActivePrograms,
    PlayScore,
    PlayFreely,
    // From data_vertex to Ui program
    ProgramWasActivated(String),
    ProgramWasDeactivated(String),
}

pub struct AudienceUi {
    sender: Sender<Connected>,
    receiver: Receiver,
    // egui_message_sender: SyncSender<AudienceUiMessage>,
    // egui_message_receiver: std::sync::mpsc::Receiver<AudienceUiMessage>,
}

impl AudienceUi {
    pub fn new(// egui_message_sender: SyncSender<AudienceUiMessage>,
        // egui_message_receiver: std::sync::mpsc::Receiver<AudienceUiMessage>,
    ) -> Result<Self> {
        let sender = nannou_osc::sender()?.connect(format!("{}:{}", "localhost", 57346))?;
        let receiver = nannou_osc::receiver(57345)?;
        Ok(Self {
            sender,
            receiver,
            // egui_message_sender,
            // egui_message_receiver,
        })
    }
    pub fn send_data_vertex_restart(&mut self) {
        for program in ["thunderbird", "konqueror", "gedit", "htop", "play_score"] {
            self.send_deactivated_program(program.to_string());
        }
    }
    pub fn send_activated_program(&mut self, program: String) {
        let addr = "/display_activate_program";
        let args = vec![Type::String(program)];
        self.sender.send((addr, args)).ok();
    }
    pub fn send_deactivated_program(&mut self, program: String) {
        let addr = "/display_deactivate_program";
        let args = vec![Type::String(program)];
        self.sender.send((addr, args)).ok();
    }
    pub fn receive_osc(&mut self) -> Vec<AudienceUiMessage> {
        let mut messages = vec![];
        while let Ok(Some((m, _addr))) = self.receiver.try_recv() {
            let osc_messages = m.into_msgs();
            for m in osc_messages {
                info!("Received osc: {:?}", &m);
                if m.addr == "/display_send_activate_action" {
                    if let Some(args) = m.args {
                        if let Some(Some(program)) = args.into_iter().next().map(|p| p.string()) {
                            if program == "play_score" {
                                messages.push(AudienceUiMessage::PlayScore);
                            } else {
                                messages.push(AudienceUiMessage::ActivateProgram(program));
                            }
                        }
                    }
                } else if m.addr == "/display_send_deactivate_action" {
                    if let Some(args) = m.args {
                        if let Some(Some(program)) = args.into_iter().next().map(|p| p.string()) {
                            if program == "play_score" {
                                messages.push(AudienceUiMessage::PlayFreely);
                            } else {
                                messages.push(AudienceUiMessage::DeactivateProgram(program));
                            }
                        }
                    }
                } else if m.addr == "/display_request_active_actions" {
                    messages.push(AudienceUiMessage::RequestActivePrograms);
                }
            }
        }
        messages
    }
    // pub fn receive_messages(&mut self) {
    //     while let Ok(m) = self.egui_message_receiver.try_recv() {
    //         match m {
    //             AudienceUiMessage::ActivateProgram(_) => unreachable!(),
    //             AudienceUiMessage::DeactivateProgram(_) => unreachable!(),
    //             AudienceUiMessage::ProgramWasActivated(program) => {
    //                 self.send_activated_program(program)
    //             }
    //             AudienceUiMessage::ProgramWasDeactivated(program) => {
    //                 self.send_deactivated_program(program)
    //             }
    //         }
    //     }
    // }
}
