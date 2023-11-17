document.querySelectorAll('a[href="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault()
    location.href = '/frontend-mentor-solutions/'
  })
})
