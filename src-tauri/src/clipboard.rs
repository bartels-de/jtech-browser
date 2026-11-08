//! Minimal clipboard access for "copy URL" (Windows only, plain Win32).

#[cfg(windows)]
mod imp {
    use std::ffi::c_void;

    const CF_UNICODETEXT: u32 = 13;
    const GMEM_MOVEABLE: u32 = 0x0002;

    #[link(name = "user32")]
    extern "system" {
        fn OpenClipboard(owner: *mut c_void) -> i32;
        fn EmptyClipboard() -> i32;
        fn SetClipboardData(format: u32, memory: *mut c_void) -> *mut c_void;
        fn CloseClipboard() -> i32;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn GlobalAlloc(flags: u32, bytes: usize) -> *mut c_void;
        fn GlobalLock(memory: *mut c_void) -> *mut c_void;
        fn GlobalUnlock(memory: *mut c_void) -> i32;
        fn GlobalFree(memory: *mut c_void) -> *mut c_void;
    }

    pub fn write_text(text: &str) -> bool {
        let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
        let bytes = wide.len() * std::mem::size_of::<u16>();
        // SAFETY: plain Win32 clipboard protocol. The global memory block is
        // owned by the system after a successful SetClipboardData and freed
        // by us otherwise.
        unsafe {
            let mut opened = false;
            for _ in 0..5 {
                if OpenClipboard(std::ptr::null_mut()) != 0 {
                    opened = true;
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(20));
            }
            if !opened {
                return false;
            }
            let mut ok = false;
            if EmptyClipboard() != 0 {
                let memory = GlobalAlloc(GMEM_MOVEABLE, bytes);
                if !memory.is_null() {
                    let target = GlobalLock(memory) as *mut u16;
                    if target.is_null() {
                        GlobalFree(memory);
                    } else {
                        std::ptr::copy_nonoverlapping(wide.as_ptr(), target, wide.len());
                        GlobalUnlock(memory);
                        if SetClipboardData(CF_UNICODETEXT, memory).is_null() {
                            GlobalFree(memory);
                        } else {
                            ok = true;
                        }
                    }
                }
            }
            CloseClipboard();
            ok
        }
    }
}

#[cfg(windows)]
pub use imp::write_text;

#[cfg(not(windows))]
pub fn write_text(_text: &str) -> bool {
    false
}
