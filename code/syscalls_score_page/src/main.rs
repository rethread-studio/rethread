use humantime::format_duration;
use leptos::*;
use leptos_router::*;
use syscalls_shared::score::{Movement, Score};

const HEIGHT_PER_DUR: f32 = 1.5;

fn main() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
    mount_to_body(|cx| view! { cx, <App/> })
}

#[component]
fn App(cx: Scope) -> impl IntoView {
    view! { cx,

      <Router>
        <nav>
          /* ... */
        </nav>
        <main
            class="mx-auto"
            >
          // all our routes will appear inside <main>
          <Routes>
            /* ... */
    <Route path="/" view=|cx| view! { cx, <ScorePage/> }/>
          </Routes>
        </main>
      </Router>
    }
}
#[component]
fn ScorePage(cx: Scope) -> impl IntoView {
    let score = Score::new();
    let total_duration = score.total_duration();
    let movements: Vec<_> = score
        .movements
        .iter()
        .map(|m| view! {cx, <MovementView mvt=m.clone() />})
        .collect();
    view! { cx,
            <div class="font-urbanist bg-slate-900 text-gray-100">
            <div class="flex flex-col">
                <h1 class="text-3xl">"Score for sys|calls"</h1>
                <span class="text-xl">"Total duration: " {format_duration(total_duration).to_string()}</span>
            </div>
            {movements}
            </div>
    }
}

#[component]
fn MovementView(cx: Scope, mvt: Movement) -> impl IntoView {
    let height = mvt.duration.as_secs_f32() * HEIGHT_PER_DUR;
    let colour = if mvt.is_break {
        "bg-blue-600"
    } else if mvt.is_interlude {
        "bg-gray-600"
    } else {
        "bg-gray-800"
    };
    view! { cx,
            <div
             class={format!("{colour} flex flex-row justify-between border-2 border-gray-900 p-1")}
             style={format!("height: {height}px;")}
             >
            <h3 class="text-xl">{format!("Mvt {}", mvt.id)}</h3>
            <p>{mvt.description}</p>
            <h3 class="text-l">{format_duration(mvt.duration).to_string()}</h3>
            </div>
    }
}
