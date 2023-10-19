// random slideshow of images, videos and live generative art

let urls = [
    // re|thread
    "https://rethread.art/code/NWL2022/window_projections/multi/?where=left",
    "https://rethread.art/code/NWL2022/window_projections/multi/?where=right",
    "https://ronikaufman.github.io/hommage-a-molnar/",
    "https://player.vimeo.com/video/709526522?autoplay=1&loop=1&muted=1",
    "https://player.vimeo.com/video/674432396?autoplay=1&loop=1&muted=1",
    "https://player.vimeo.com/video/665661685?autoplay=1&loop=1&muted=1",
    "https://player.vimeo.com/video/483464921?autoplay=1&loop=1&muted=1",
    "/images/unfold/unfold_blue.jpg",
    "/images/syscalls/syscalls_no_audience.jpg",
    "/images/syscalls/syscalls_with_audience_1.jpg",
    "/images/kulturnat/triangle.jpg",
    "/images/drift/code.png",
    "/images/drift/driftIntro.jpg",
    "/images/cyberglow/laser.jpg",
    // Vera Molnar
    "https://awarewomenartists.com/wp-content/uploads/2017/05/vera-molnar_1-de-desordre-bleu-et-rouge-a-b-c-et-d_1974-1978_aware_women-artists_artistes-femmes.jpg",
    "https://awarewomenartists.com/wp-content/uploads/2017/05/vera-molnar_meule-la-nuit-p_1977-2013_aware_women-artists_artistes-femmes-1500x1493.jpg",
    "https://awarewomenartists.com/wp-content/uploads/2017/05/vera-molnar_du-cycle-errance-entre-ordre-et-chaos_1975_aware_women-artists_artistes-femmes-1485x1500.jpg",
    "https://fovarosikeptar.hu/wp-content/uploads/2019/10/fovarosi-keptar-2019-vera-molnar-04.jpg",
    "https://fovarosikeptar.hu/wp-content/uploads/2019/10/fovarosi-keptar-2019-vera-molnar-05.jpg",
    "https://fovarosikeptar.hu/wp-content/uploads/2019/10/fovarosi-keptar-2019-vera-molnar-06.jpg",
    "https://fovarosikeptar.hu/wp-content/uploads/2019/10/fovarosi-keptar-2019-vera-molnar-09.jpg",
    // Sol LeWitt
    "https://dayoftheartist.files.wordpress.com/2014/02/sol-lewitt-wall-drawing-879.jpg",
    "https://dayoftheartist.files.wordpress.com/2014/02/sol-lewitt-pompidou-metz-1342985369_org.jpg",
    "https://cdn.shortpixel.ai/spai/q_glossy+ret_img+to_auto/https://www.slantmagazine.com/wp-content/uploads/2014/05/sollewitt.jpg",
    "https://jiangxinye.files.wordpress.com/2013/02/sol-lewitt-color-bands.jpg",
    "https://www.youtube.com/embed/soVrrg5TBO0?autoplay=1&mute=1",
    "https://www.youtube.com/embed/gVXjIrlyvRw?autoplay=1&mute=1",
    // A. Michael Noll
    "https://spalterdigital.com/wp-content/uploads/2015/07/IMG_40261.jpg",
    // Frieder Nake
    "https://spalterdigital.com/wp-content/uploads/2018/06/IMG_0234.jpg",
    "https://spalterdigital.com/wp-content/uploads/2018/06/IMG_0320.jpg",
    // Hiroshi Kawano
    "https://spalterdigital.com/wp-content/uploads/2018/05/IMG_0196.jpg",
    // John Maeda
    "https://spalterdigital.com/wp-content/uploads/2018/08/IMG_0595.jpg",
    // Manfred Mohr
    "https://spalterdigital.com/wp-content/uploads/2022/03/mohr_kubus_1-1.jpg",
    "https://spalterdigital.com/wp-content/uploads/2018/06/IMG_0220.jpg",
    "https://spalterdigital.com/wp-content/uploads/2017/06/Screen-Shot-2017-06-28-at-12.17.45-PM.png",
    "https://spalterdigital.com/wp-content/uploads/2016/03/DSC_9419a.jpg",
    "https://spalterdigital.com/wp-content/uploads/2016/01/DSC_8528-copy.jpg",
    "https://spalterdigital.com/wp-content/uploads/2015/12/DSC_8399-copy.jpg",
    "https://spalterdigital.com/wp-content/uploads/2015/12/DSC_8371-copy.jpg",
    "https://spalterdigital.com/wp-content/uploads/2015/12/DSC_8327-copy-e1654195138988.jpg",
    //  Zach Lieberman
    "https://spalterdigital.com/wp-content/uploads/2023/07/Screen-Shot-2023-07-16-at-12.21.54-PM.png",
    "https://spalterdigital.com/wp-content/uploads/2019/07/IMG_2880.jpg",
    "https://spalterdigital.com/wp-content/uploads/2019/07/IMG_1455.jpg",
    "https://spalterdigital.com/wp-content/uploads/2019/07/IMG_7482.jpg",
    // LIA
    "https://liaworks.com/wp-content/uploads/2018/08/01__2018_08_06_19_15_46_photo.jpg",
    "https://liaworks.com/wp-content/uploads/2018/07/Weaving_01.png",
    //  Shiqing (Licia) He
    "https://eyesofpandaweb.s3.us-east-2.amazonaws.com/website_public/aws_processed_media/gallery_assets/20211014/20211014_8.jpg",
    "https://eyesofpandaweb.s3.us-east-2.amazonaws.com/website_public/aws_processed_media/gallery_assets/20201128/20201128_0.jpg",
    "https://eyesofpandaweb.s3.us-east-2.amazonaws.com/website_public/aws_processed_media/gallery_assets/20200922/20200922_4.jpg",
    // Saskia Freeke
    "https://player.vimeo.com/video/488159723?autoplay=1&loop=1&muted=1",
    "https://player.vimeo.com/video/309138645?autoplay=1&loop=1&muted=1",
    "https://player.vimeo.com/video/249262218?autoplay=1&loop=1&muted=1"
];
let currentUrl;
let iframeElement, imgElement;

const N_FRAMES = 3600;

function setup() {
    frameCount = N_FRAMES-1;
    iframeElement = document.getElementsByTagName("iframe")[0];
    imgElement = document.getElementsByTagName("img")[0];
}

function draw() {
    if (frameCount % N_FRAMES == 0) {
        let newUrl;
        do {
            newUrl = random(urls);
        } while (newUrl == currentUrl)
        currentUrl = newUrl;
        console.log(newUrl)
        if (currentUrl.slice(-3) === "jpg" || currentUrl.slice(-3) === "png") {
            iframeElement.src = "";
            imgElement.src = currentUrl;
            iframeElement.style.display = "none";
            imgElement.style.display = "block";
        } else {
            iframeElement.src = currentUrl;
            imgElement.src = "";
            iframeElement.style.display = "block";
            imgElement.style.display = "none";
        }
    }
}