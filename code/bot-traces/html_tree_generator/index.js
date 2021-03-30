const cheerio = require('cheerio');
const { count } = require('console');

// Load the HTML
const fs = require('fs');
const { isArray } = require('util');
const test_data = "google";
const fileContents = fs.readFileSync('./test_html_files/' + test_data + '_test_html.html').toString()

const $ = cheerio.load(fileContents);

let categories = {
  'structure': [
    'div', 'section', 'article', 'nav', 'header', 'footer', 'main', 'span'
  ],
  'content': [
    'audio', 'video', 'img', 'iframe', 'a', 'button', 'embed', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  ]
}

let tags = {}


for (const key in categories) {
  for(const tag of categories[key]) {
    tags[tag] = key;
  }
}
console.log(JSON.stringify(tags))

if("a" in tags) {
  console.log(`a in tags: ${tags["a"]}`)
}

// console.log($('html'))S

let obj = {
  tag: "html",
  category: 'unknown',
  total_children: 0, // calculated later
  children: [],
}
add_children($('html'), obj);
count_children(obj);

function add_children(node, object) {
  // console.log(node)
  // set category
  let category = 'unknown';
  if(node.name in tags) {
    category = tags[node.name]
  }
  object.category = category;
  let children = null;
  if(Array.isArray(node.children)) {
    children = node.children;
  } else if(node.children instanceof Function) {
    children = node.children()
  }
  if (children != null) {
    for(let child of children) {
      if(child.name !== undefined) {
        let new_obj = {
          tag: child.name,
          category: category,
          total_children: 0,
          children: [],
        }
        add_children(child, new_obj);
        object.children.push(new_obj)
      }
    }
  }
  
}

function count_children(object) {
  let num_children = 0;
  for(child of object.children) {
    num_children += 1;
    num_children += count_children(child);
  }
  object.total_children = num_children;
  return num_children;
}


fs.writeFile(test_data + "_html_json.json", JSON.stringify(obj), function (err) {
  if (err) return console.log(err);
  console.log('html tree > html_json.json');
})
// console.log(JSON.stringify(obj))