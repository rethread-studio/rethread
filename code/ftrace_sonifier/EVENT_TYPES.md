
# tcp

tcp_probe
tcp_rcv_space_adjust
tcp_destroy_sock
tcp_retransmit_skb
tcp_receive_reset
tcp_send_reset

# random

urandom_read
mix_pool_bytes_nolock
credit_entropy_bits
mix_pool_bytes
add_input_randomness
xfer_secondary_pool
extract_entropy
debit_entropy
push_to_pool
add_device_randomness
get_random_bytes

// when getting random numbers through /dev/random

extract_entropy_user
random_read

# fs

do_sys_open
open_exec


# irq
// irq: Interrupt ReQuest, an interrupt from hardware to the processor.

softirq_raise
softirq_entry
softirq_exit
irq_handler_entry
irq_handler_exit


# drm
// drm: Direct Rendering Manager for interfacing with GPUs of modern video cards

drm_vblank_event_delivered
drm_vblank_event
drm_vblank_event_queued

# exceptions
// exceptions: lots and lots of pagefaults

page_fault_user
page_fault_kernel